package com.jgy36.PoliticalApp.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // ✅ Each comment belongs to a user

    @ManyToOne
    @JoinColumn(name = "post_id", nullable = true)
    @JsonBackReference // ✅ Prevent infinite recursion (Post -> Comment -> Post)
    private Post post; // ✅ Each comment belongs to a post

    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CommentLike> commentLikes = new HashSet<>();

    @Column(nullable = false, length = 1000) // Max comment length: 1000 chars
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "parent_comment_id")
    @JsonIgnore // ✅ Prevents recursive loop in nested comments
    private Comment parentComment;

    // ✅ Constructor needed for new Comment(text, user, post)
    public Comment(String content, User user, Post post) {
        this.content = content;
        this.user = user;
        this.post = post;
        this.createdAt = LocalDateTime.now();
    }
}
