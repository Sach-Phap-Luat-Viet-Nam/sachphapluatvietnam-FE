"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { EditorContent, Extension, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { Button, cn } from "@slvn/ui";
import { INPUT, TEXTAREA } from "@/components/form-styles";

/**
 * Node Heading của Tiptap bỏ thuộc tính lạ khi đọc HTML. Giữ `id` của tiêu đề vì Storefront dùng nó làm neo mục lục
 * (`/dieu-khoan-su-dung#pham-vi`): sửa chữ trong tiêu đề không làm hỏng link cũ.
 */
const HeadingId = Extension.create({
  name: "headingId",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("id"),
            renderHTML: (attributes) => (attributes.id ? { id: attributes.id } : {}),
          },
        },
      },
    ];
  },
});

/** Chỉ bật định dạng Storefront giữ lại khi lọc HTML (apps/storefront/src/features/legal/policy-html.ts). */
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    strike: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      // Storefront tự gắn target/rel theo link trong hay ngoài site: lưu HTML gọn.
      HTMLAttributes: { target: null, rel: null, class: null },
    },
  }),
  HeadingId,
];

const CONTENT_CLASS =
  "min-h-96 px-4 py-3 leading-7 outline-none [&_a]:text-primary [&_a]:underline [&_blockquote]:border-border [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:font-semibold [&_hr]:border-border [&_hr]:my-4 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&>*:first-child]:mt-0";

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Giữ vùng chọn trong editor khi bấm nút (mất focus thì lệnh áp vào chỗ khác).
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded transition-colors disabled:opacity-40",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function LinkEditor({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [href, setHref] = useState(() => String(editor.getAttributes("link").href ?? ""));
  const apply = () => {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (value === "") {
      chain.unsetLink().run();
    } else {
      chain.setLink({ href: value }).run();
    }
    onClose();
  };

  return (
    <div className="border-border flex flex-wrap items-center gap-2 border-b px-2 py-2">
      <label htmlFor="rich-text-link" className="text-sm font-medium">
        Link
      </label>
      <input
        id="rich-text-link"
        type="text"
        inputMode="url"
        value={href}
        placeholder="/chinh-sach-bao-mat hoặc https://…"
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
          if (event.key === "Escape") onClose();
        }}
        className={cn(INPUT, "h-9 min-w-48 flex-1")}
        autoFocus
      />
      <Button size="sm" onClick={apply}>
        Áp dụng
      </Button>
      <Button size="sm" variant="ghost" onClick={onClose}>
        Đóng
      </Button>
    </div>
  );
}

function Toolbar({ editor, onLink, sourceMode, onToggleSource }: {
  editor: Editor;
  onLink: () => void;
  sourceMode: boolean;
  onToggleSource: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      paragraph: current.isActive("paragraph"),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => () =>
    command(editor.chain().focus()).run();
  const off = sourceMode;

  return (
    <div role="toolbar" aria-label="Định dạng nội dung" className="border-border flex flex-wrap gap-0.5 border-b p-1">
      <ToolbarButton label="Đoạn văn" active={state.paragraph} disabled={off} onClick={run((c) => c.setParagraph())}>
        <Pilcrow size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Tiêu đề mục (hiện trong mục lục)"
        active={state.h2}
        disabled={off}
        onClick={run((c) => c.toggleHeading({ level: 2 }))}
      >
        <Heading2 size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Tiêu đề phụ"
        active={state.h3}
        disabled={off}
        onClick={run((c) => c.toggleHeading({ level: 3 }))}
      >
        <Heading3 size={17} aria-hidden="true" />
      </ToolbarButton>
      <span aria-hidden="true" className="bg-border mx-1 w-px" />
      <ToolbarButton label="In đậm" active={state.bold} disabled={off} onClick={run((c) => c.toggleBold())}>
        <Bold size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="In nghiêng" active={state.italic} disabled={off} onClick={run((c) => c.toggleItalic())}>
        <Italic size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Gạch chân"
        active={state.underline}
        disabled={off}
        onClick={run((c) => c.toggleUnderline())}
      >
        <Underline size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Chèn hoặc sửa link" active={state.link} disabled={off} onClick={onLink}>
        <Link2 size={17} aria-hidden="true" />
      </ToolbarButton>
      <span aria-hidden="true" className="bg-border mx-1 w-px" />
      <ToolbarButton
        label="Danh sách gạch đầu dòng"
        active={state.bulletList}
        disabled={off}
        onClick={run((c) => c.toggleBulletList())}
      >
        <List size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Danh sách đánh số"
        active={state.orderedList}
        disabled={off}
        onClick={run((c) => c.toggleOrderedList())}
      >
        <ListOrdered size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Khối ghi chú"
        active={state.blockquote}
        disabled={off}
        onClick={run((c) => c.toggleBlockquote())}
      >
        <Quote size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Đường kẻ ngang" disabled={off} onClick={run((c) => c.setHorizontalRule())}>
        <Minus size={17} aria-hidden="true" />
      </ToolbarButton>
      <span aria-hidden="true" className="bg-border mx-1 w-px" />
      <ToolbarButton label="Hoàn tác" disabled={off || !state.canUndo} onClick={run((c) => c.undo())}>
        <Undo2 size={17} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Làm lại" disabled={off || !state.canRedo} onClick={run((c) => c.redo())}>
        <Redo2 size={17} aria-hidden="true" />
      </ToolbarButton>
      <span className="ml-auto" />
      <ToolbarButton label="Sửa mã HTML" active={sourceMode} onClick={onToggleSource}>
        <Code2 size={17} aria-hidden="true" />
      </ToolbarButton>
    </div>
  );
}

export interface RichTextEditorProps {
  /** `id` của vùng soạn thảo, nối với nhãn/gợi ý/lỗi của `Field`. */
  id: string;
  /** Tên đọc cho trình đọc màn hình (`label htmlFor` không gắn được vào vùng contenteditable). */
  label: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Trình soạn thảo WYSIWYG (Tiptap) cho trang tĩnh, kèm chế độ sửa mã HTML. HTML lưu đi qua schema của Tiptap nên chỉ
 * còn thẻ trình soạn thảo hỗ trợ; Storefront vẫn lọc lại trước khi hiển thị.
 */
export function RichTextEditor({ id, label, value, onChange, onBlur, invalid = false, describedBy }: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    // Next.js render trước ở server: chờ trình duyệt mới dựng editor để không lệch hydrate.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: CONTENT_CLASS,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    onBlur: () => onBlur?.(),
  });

  const toggleSource = () => {
    if (!editor) return;
    if (source === null) {
      setLinkOpen(false);
      setSource(editor.getHTML());
      return;
    }
    // Quay lại chế độ soạn thảo: HTML được Tiptap đọc lại (bỏ thẻ không hỗ trợ) rồi báo giá trị mới cho form.
    editor.commands.setContent(source, { emitUpdate: true });
    setSource(null);
  };

  return (
    <div
      className={cn(
        "bg-background border-border focus-within:border-primary overflow-hidden rounded-md border transition-colors",
        invalid && "border-danger",
      )}
    >
      {editor ? (
        <>
          <Toolbar
            editor={editor}
            onLink={() => setLinkOpen((open) => !open)}
            sourceMode={source !== null}
            onToggleSource={toggleSource}
          />
          {linkOpen && source === null && <LinkEditor editor={editor} onClose={() => setLinkOpen(false)} />}
        </>
      ) : (
        <div className="border-border h-11 border-b" />
      )}
      {source !== null ? (
        <textarea
          aria-label="Mã HTML của nội dung"
          value={source}
          spellCheck={false}
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value);
          }}
          onBlur={onBlur}
          className={cn(TEXTAREA, "min-h-96 rounded-none border-0 font-mono text-sm")}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
