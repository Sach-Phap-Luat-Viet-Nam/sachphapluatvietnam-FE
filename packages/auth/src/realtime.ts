import { z } from "zod";
import { browserApi, endSession, getSessionState, subscribeSession } from "./session";
import { unwrap } from "@slvn/api-client";

// Thông báo realtime qua Pusher Channels: server bắn `session-ended` lên kênh riêng `private-user-{id}` khi phiên của
// tài khoản bị kết thúc (đăng nhập nơi khác, bị buộc đăng xuất). Xem docs/features/session-realtime.md.

export interface RealtimeConfig {
  key: string;
  cluster: string;
}

const SESSION_ENDED_EVENT = "session-ended";

/** Chữ ký kênh do `POST /realtime/auth` trả (OpenAPI không mô tả vì backend trả JSON thô). */
const channelAuthSchema = z.object({ auth: z.string() });

const sessionEndedSchema = z.object({
  reason: z.enum(["signed_in_elsewhere", "forced_logout"]),
  version: z.number(),
});

/**
 * Xử lý một sự kiện `session-ended`. Chỉ kết thúc phiên khi phiên bản trong sự kiện mới hơn phiên bản của phiên hiện
 * tại: thiết bị vừa đăng nhập mang đúng phiên bản đó nên không tự đăng xuất. Trả `true` nếu đã kết thúc phiên.
 */
export function handleSessionEnded(payload: unknown): boolean {
  const parsed = sessionEndedSchema.safeParse(payload);
  const state = getSessionState();
  if (!parsed.success || state.status !== "authenticated" || parsed.data.version <= state.sessionVersion) {
    return false;
  }
  endSession(parsed.data.reason);
  return true;
}

interface PusherChannel {
  bind(event: string, callback: (data: unknown) => void): void;
}
interface PusherClient {
  subscribe(channel: string): PusherChannel;
  disconnect(): void;
}
type PusherFactory = (config: RealtimeConfig) => Promise<PusherClient>;

async function createPusher(config: RealtimeConfig): Promise<PusherClient> {
  // Nạp lười: khách vãng lai không tải thư viện.
  const { default: Pusher } = await import("pusher-js");
  return new Pusher(config.key, {
    cluster: config.cluster,
    channelAuthorization: {
      transport: "ajax",
      endpoint: "/api/v1/realtime/auth",
      customHandler: ({ socketId, channelName }, callback) => {
        // Đi qua client có Bearer (tự refresh khi 401) thay vì để pusher-js tự POST không kèm token.
        unwrap(browserApi().POST("/api/v1/realtime/auth", { body: { socketId, channelName } }))
          .then((data) => callback(null, channelAuthSchema.parse(data)))
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error("Realtime auth failed"), null),
          );
      },
    },
  });
}

/**
 * Nghe kênh riêng của tài khoản đang đăng nhập; tự kết nối khi đăng nhập và ngắt khi đăng xuất hoặc đổi tài khoản.
 * Trả hàm hủy. Chưa cấu hình Pusher (`config` null) thì không làm gì: phiên bị kết thúc vẫn bị 401 ở lần gọi kế tiếp.
 */
export function startSessionRealtime(config: RealtimeConfig | null, factory: PusherFactory = createPusher): () => void {
  if (!config) {
    return () => {};
  }
  let connectedUserId: number | null = null;
  let client: PusherClient | null = null;
  let generation = 0;

  const disconnect = () => {
    generation += 1;
    client?.disconnect();
    client = null;
    connectedUserId = null;
  };

  const sync = () => {
    const state = getSessionState();
    const userId = state.status === "authenticated" ? state.user.id : null;
    if (userId === connectedUserId) {
      return;
    }
    disconnect();
    if (userId === null) {
      return;
    }
    connectedUserId = userId;
    const mine = generation;
    factory(config)
      .then((pusher) => {
        if (mine !== generation) {
          pusher.disconnect();
          return;
        }
        client = pusher;
        pusher.subscribe(`private-user-${userId}`).bind(SESSION_ENDED_EVENT, handleSessionEnded);
      })
      .catch(() => {
        // Không nạp được thư viện hoặc mạng lỗi: bỏ qua, phiên bị kết thúc vẫn được phát hiện qua 401.
        if (mine === generation) {
          connectedUserId = null;
        }
      });
  };

  const unsubscribe = subscribeSession(sync);
  sync();
  return () => {
    unsubscribe();
    disconnect();
  };
}
