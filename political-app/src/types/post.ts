export interface PostType {
  id: number;
  author: string; // 🔄 Renamed from `username`
  content: string;
  likes: number;
  createdAt: string; // 📌 Java LocalDateTime will be a string
}
