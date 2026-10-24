import type * as AuthSessionModule from "./session";
import type * as RealtimeModule from "./realtime";

const user = {
  id: 12,
  email: "khach@example.com",
  fullName: "Nguyễn Văn A",
  roles: ["customer"],
  requiresTwoFactorSetup: false,
};

let session: typeof AuthSessionModule;
let realtime: typeof RealtimeModule;

function signIn(sessionVersion: number, id = user.id) {
  session.startSession({ accessToken: "t", expiresIn: 900, user: { ...user, id }, sessionVersion });
}

function fakePusher() {
  const handlers = new Map<string, (data: unknown) => void>();
  const subscribed: string[] = [];
  const disconnect = vi.fn();
  const client = {
    subscribe: (channel: string) => {
      subscribed.push(channel);
      return { bind: (event: string, callback: (data: unknown) => void) => handlers.set(event, callback) };
    },
    disconnect,
  };
  return { factory: vi.fn(() => Promise.resolve(client)), handlers, subscribed, disconnect };
}

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  session = await import("./session");
  realtime = await import("./realtime");
});

describe("handleSessionEnded", () => {
  it("kết thúc phiên khi phiên bản trong sự kiện mới hơn và ghi lý do", () => {
    signIn(3);

    expect(realtime.handleSessionEnded({ reason: "signed_in_elsewhere", version: 4 })).toBe(true);

    expect(session.getSessionState()).toEqual({ status: "anonymous", sessionEnded: "signed_in_elsewhere" });
    expect(localStorage.getItem("slvn:has-session")).toBeNull();
  });

  it("bỏ qua sự kiện của chính thiết bị vừa đăng nhập (phiên bản bằng nhau)", () => {
    signIn(4);

    expect(realtime.handleSessionEnded({ reason: "signed_in_elsewhere", version: 4 })).toBe(false);
    expect(session.getSessionState()).toMatchObject({ status: "authenticated" });
  });

  it("bỏ qua sự kiện cũ hơn, sai định dạng hoặc khi chưa đăng nhập", () => {
    signIn(5);
    expect(realtime.handleSessionEnded({ reason: "forced_logout", version: 2 })).toBe(false);
    expect(realtime.handleSessionEnded({ reason: "lạ", version: 9 })).toBe(false);
    expect(realtime.handleSessionEnded("{}")).toBe(false);
    session.clearSession();
    expect(realtime.handleSessionEnded({ reason: "forced_logout", version: 9 })).toBe(false);
  });

  it("phiên đăng nhập hộ bị kết thúc như hết hạn, không ghi lý do của chính chủ", () => {
    session.startImpersonation({
      accessToken: "imp",
      expiresIn: 900,
      user,
      loginVia: "admin",
      impersonatorId: 1,
      sessionVersion: 2,
    });

    expect(realtime.handleSessionEnded({ reason: "forced_logout", version: 3 })).toBe(true);

    expect(session.getSessionState()).toEqual({ status: "anonymous", impersonationEnded: "expired" });
  });
});

describe("startSessionRealtime", () => {
  it("không làm gì khi chưa cấu hình Pusher", () => {
    const pusher = fakePusher();
    signIn(0);

    realtime.startSessionRealtime(null, pusher.factory)();

    expect(pusher.factory).not.toHaveBeenCalled();
  });

  it("nghe kênh riêng của tài khoản sau khi đăng nhập và ngắt khi đăng xuất", async () => {
    const pusher = fakePusher();
    const stop = realtime.startSessionRealtime({ key: "k", cluster: "ap1" }, pusher.factory);
    expect(pusher.factory).not.toHaveBeenCalled();

    signIn(1);
    await vi.waitFor(() => expect(pusher.subscribed).toEqual(["private-user-12"]));
    pusher.handlers.get("session-ended")?.({ reason: "forced_logout", version: 2 });

    expect(session.getSessionState()).toEqual({ status: "anonymous", sessionEnded: "forced_logout" });
    expect(pusher.disconnect).toHaveBeenCalled();
    stop();
  });

  it("đổi tài khoản thì chuyển sang kênh mới", async () => {
    const pusher = fakePusher();
    const stop = realtime.startSessionRealtime({ key: "k", cluster: "ap1" }, pusher.factory);

    signIn(1, 12);
    await vi.waitFor(() => expect(pusher.subscribed).toEqual(["private-user-12"]));
    signIn(1, 99);
    await vi.waitFor(() => expect(pusher.subscribed).toEqual(["private-user-12", "private-user-99"]));

    expect(pusher.disconnect).toHaveBeenCalledTimes(1);
    stop();
  });
});
