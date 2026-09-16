# Pulling A Girl — Product Context

## 1. Mục tiêu

Xây dựng một web app giúp người dùng tạo câu trả lời cho tin nhắn của một cô gái để tán.

Người dùng cung cấp:
- Context của cuộc trò chuyện nếu cần.
- Tin nhắn mới nhất của cô gái.

Sau đó bấm nút generate, app gửi thông tin tới LLM cùng với system prompt trong `prompt.md` và nhận về **một câu trả lời duy nhất** theo đúng style của người dùng.

Mục tiêu là tạo ra câu trả lời:
- Tự nhiên.
- Ngắn gọn.
- Có thể copy và gửi ngay.
- Phù hợp với context.
- Giống cách người dùng thực sự nhắn tin.

---

## 2. User Flow

### Bước 1 — Nhập context

Có một ô nhập `Context`.

Context là optional.

Người dùng có thể mô tả tình huống hiện tại, ví dụ:

> Bọn t đang nói chuyện về việc cuối tuần đi chơi. Hôm qua t rủ nhưng cô ấy bảo chưa chắc.

Nếu không cần context thì có thể để trống.

### Bước 2 — Nhập tin nhắn

Có một ô nhập `Her's message` / `Tin nhắn của cô ấy`.

Ví dụ:

> cuối tuần này chắc t bận mất rồi =)))

Đây là input bắt buộc.

### Bước 3 — Generate

Người dùng bấm nút `Generate`.

App gửi:
- Context
- Tin nhắn của cô ấy
- System prompt từ `prompt.md`

tới LLM.

### Bước 4 — Hiển thị kết quả

App hiển thị **duy nhất một câu trả lời**.

Ví dụ:

> Không sao mà, khi nào cậu rảnh thì mình đi cũng được

Kết quả phải có nút `Copy` để người dùng copy nhanh.

---

## 3. Input

### Context

- Optional.
- Multiline text.
- Không cần giới hạn người dùng phải viết theo format cụ thể.
- Nếu trống, LLM chỉ dựa vào tin nhắn của cô ấy và system prompt.

### Her's message

- Required.
- Multiline text.
- Đây là tin nhắn cần phản hồi.

Không cần thêm các field phức tạp ở MVP.

---

## 4. Output

LLM phải trả về:

**Exactly one reply.**

Không hiển thị:
- Multiple options.
- Explanation.
- Analysis.
- Reasoning.
- Score.
- Suggested alternatives.

UI chỉ cần hiển thị câu trả lời cuối cùng.

Người dùng có thể copy câu trả lời bằng một nút.

---

## 5. LLM Behavior

`prompt.md` là source of truth cho cách LLM tạo câu trả lời.

Không hardcode style hoặc các câu trả lời mẫu vào frontend/backend nếu chúng đã được định nghĩa trong `prompt.md`.

Request tới LLM nên có cấu trúc tương tự:

```text
SYSTEM:
[contents of prompt.md]

USER:
Context:
{{context}}

Her:
{{her_message}}
```

Nếu context rỗng thì vẫn gửi request bình thường.

---

## 6. UI/UX

UI nên đơn giản, clean và tập trung vào một workflow duy nhất:

```text
┌─────────────────────────────────────┐
│ Context                             │
│                                     │
│ [ optional context...             ] │
│                                     │
│ Her's message                       │
│                                     │
│ [ message...                      ] │
│                                     │
│             [ Generate ]             │
└─────────────────────────────────────┘

                ↓

┌─────────────────────────────────────┐
│ Reply                               │
│                                     │
│ Không sao mà, khi nào cậu rảnh...  │
│                                     │
│                         [ Copy ]    │
└─────────────────────────────────────┘
```

Ưu tiên:
- Minimal.
- Dễ dùng.
- Không có UI thừa.
- Generate button rõ ràng.
- Result dễ đọc và dễ copy.
- Loading state rõ ràng.
- Error state rõ ràng.

Nếu project đã có design system thì sử dụng design system hiện tại.

---

## 7. States

App cần xử lý tối thiểu:

### Idle

Chưa generate gì.

### Loading

Đang gọi LLM.

Disable Generate trong lúc request đang chạy để tránh duplicate request.

### Success

Hiển thị một reply.

### Error

Hiển thị lỗi thân thiện và cho phép người dùng thử lại.

### Empty message

Nếu `Her's message` trống thì không gửi request.

Hiển thị validation phù hợp.

---

## 8. API / Security

API key của LLM **không được expose ở frontend**.

Nếu framework hỗ trợ server-side API routes/server actions/backend thì request tới LLM phải đi qua server.

API key lấy từ environment variable.

Ví dụ:

```env
OPENAI_API_KEY=...
```

Tên biến có thể thay đổi theo provider hiện tại của project.

Không commit secret vào repository.

---

## 9. Scope MVP

MVP chỉ cần:

- Context input.
- Her's message input.
- Generate button.
- LLM request.
- System prompt từ `prompt.md`.
- Loading state.
- Error state.
- Một reply duy nhất.
- Copy button.

Không cần:

- Authentication.
- Database.
- Chat history.
- User accounts.
- Analytics.
- Multiple reply options.
- Fine-tuning.
- RAG.
- Complex memory system.
- Admin dashboard.

Có thể mở rộng những phần này sau khi MVP hoạt động ổn định.

---

## 10. Important

`prompt.md` chứa logic về personality, texting style và cách tạo reply.

`context.md` chỉ mô tả product behavior.

Không trộn product logic vào system prompt và không trộn personality rules vào UI code.