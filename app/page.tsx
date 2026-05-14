"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Memory = {
  id: string;
  name: string | null;
  country: string | null;
  message: string;
  photo_url: string | null;
  created_at: string;
};

type MemoryComment = {
  id: string;
  memory_id: string;
  name: string | null;
  comment: string;
  created_at: string;
};

export default function HomePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [comments, setComments] = useState<Record<string, MemoryComment[]>>(
    {}
  );

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const [commentNames, setCommentNames] = useState<Record<string, string>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [openCommentForms, setOpenCommentForms] = useState<
    Record<string, boolean>
  >({});

  async function loadComments(memoryIds: string[]) {
    if (memoryIds.length === 0) {
      setComments({});
      return;
    }

    const { data, error } = await supabase
      .from("memory_comments")
      .select("*")
      .in("memory_id", memoryIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load comments error:", error);
      return;
    }

    const groupedComments: Record<string, MemoryComment[]> = {};

    for (const comment of data || []) {
      if (!groupedComments[comment.memory_id]) {
        groupedComments[comment.memory_id] = [];
      }

      groupedComments[comment.memory_id].push(comment);
    }

    setComments(groupedComments);
  }

  async function loadMemories() {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load memories error:", error);
      return;
    }

    const loadedMemories = data || [];
    setMemories(loadedMemories);

    await loadComments(loadedMemories.map((memory) => memory.id));
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice("");

    if (!message.trim()) {
      setNotice("Please write a short message.");
      return;
    }

    if (message.trim().length > 300) {
      setNotice("Please keep your message under 300 characters.");
      return;
    }

    if (name.trim().length > 40) {
      setNotice("Please keep your name under 40 characters.");
      return;
    }

    if (country.trim().length > 40) {
      setNotice("Please keep your country under 40 characters.");
      return;
    }

    if (photo && photo.size > 10 * 1024 * 1024) {
      setNotice("Please upload an image smaller than 10MB.");
      return;
    }

    setLoading(true);

    try {
      let photoUrl: string | null = null;

      if (photo) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(fileName, photo, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(fileName);

        photoUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase.from("memories").insert({
        name: name.trim() || "Anonymous",
        country: country.trim() || null,
        message: message.trim(),
        photo_url: photoUrl,
        status: "approved",
      });

      if (insertError) {
        throw insertError;
      }

      setName("");
      setCountry("");
      setMessage("");
      setPhoto(null);
      setFileInputKey((prev) => prev + 1);

      await loadMemories();

      setNotice("Thank you. Your memory has been shared on the wall.");
    } catch (error) {
      console.error("Submit memory error:", error);
      setNotice("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommentSubmit(memoryId: string) {
    const commentName = commentNames[memoryId]?.trim() || "";
    const commentText = commentTexts[memoryId]?.trim() || "";

    if (!commentText) {
      alert("Please write a comment.");
      return;
    }

    if (commentText.length > 200) {
      alert("Please keep your comment under 200 characters.");
      return;
    }

    if (commentName.length > 40) {
      alert("Please keep your name under 40 characters.");
      return;
    }

    setCommentLoading((prev) => ({
      ...prev,
      [memoryId]: true,
    }));

    try {
      const { error } = await supabase.from("memory_comments").insert({
        memory_id: memoryId,
        name: commentName || "Anonymous",
        comment: commentText,
      });

      if (error) {
        throw error;
      }

      setCommentTexts((prev) => ({
        ...prev,
        [memoryId]: "",
      }));

      setOpenCommentForms((prev) => ({
        ...prev,
        [memoryId]: false,
      }));

      await loadComments(memories.map((memory) => memory.id));
    } catch (error) {
      console.error("Submit comment error:", error);
      alert("Comment failed. Please try again.");
    } finally {
      setCommentLoading((prev) => ({
        ...prev,
        [memoryId]: false,
      }));
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1ea] text-[#1f1b16]">
      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hostel-bg.png"
            alt="Friends Hostel Astana"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 max-w-4xl px-6 text-center text-white">
          <p className="mb-4 text-sm tracking-[0.35em] uppercase text-white/80">
            Friends Hostel Astana
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight">
            Memory Wall
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl leading-relaxed text-white/85">
            A shared space for travelers, friends, and unforgettable moments.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#upload"
              className="rounded-full bg-white px-8 py-4 text-[#1f1b16] font-semibold hover:bg-[#ead7bd] transition"
            >
              Upload a Memory
            </a>

            <a
              href="#memories"
              className="rounded-full border border-white/50 px-8 py-4 text-white font-semibold hover:bg-white/10 transition"
            >
              View Memories
            </a>
          </div>
        </div>
      </section>

      {/* Memories */}
      <section id="memories" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm tracking-[0.28em] uppercase text-[#9c7a4f]">
            Shared Moments
          </p>

          <h2 className="text-4xl md:text-5xl font-semibold">
            Shared Memories
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-[#6e6258]">
            Every photo here tells a small story from Friends Hostel.
          </p>
        </div>

        {memories.length === 0 ? (
          <div className="rounded-[2rem] border border-[#eadfd5] bg-white/70 p-10 text-center text-[#6e6258]">
            No memories yet. Be the first to share one.
          </div>
        ) : (
          <div className="columns-1 gap-7 md:columns-2 lg:columns-3">
            {memories.map((memory, index) => {
              const rotateClass =
                index % 3 === 0
                  ? "rotate-[-0.8deg]"
                  : index % 3 === 1
                  ? "rotate-[0.6deg]"
                  : "rotate-[0.2deg]";

              const memoryComments = comments[memory.id] || [];

              return (
                <article
                  key={memory.id}
                  className={`relative mb-9 break-inside-avoid rounded-[2rem] border border-[#eadfd5] bg-[#fffaf7] p-4 pt-8 shadow-[0_18px_50px_-28px_rgba(31,27,22,0.45)] transition duration-300 ${rotateClass} hover:rotate-0 hover:-translate-y-1 hover:shadow-[0_28px_70px_-32px_rgba(31,27,22,0.55)]`}
                >
                  {/* Rope and clips */}
                  <div className="pointer-events-none absolute -top-3 left-7 right-7 h-8">
                    <div className="absolute left-0 right-0 top-3 h-px bg-[#b99c7a]/60" />

                    <div className="absolute left-8 top-0 h-6 w-4 rounded-b-full border border-[#b99c7a]/60 bg-[#f7f1ea] shadow-sm" />
                    <div className="absolute right-8 top-0 h-6 w-4 rounded-b-full border border-[#b99c7a]/60 bg-[#f7f1ea] shadow-sm" />
                  </div>

                  {memory.photo_url && (
                    <div className="mb-5 max-h-[520px] overflow-hidden rounded-[1.5rem] bg-[#f7f1ea]">
                      <img
                        src={memory.photo_url}
                        alt={memory.message}
                        className="w-full object-cover object-center"
                      />
                    </div>
                  )}

                  <div className="px-2 pb-2">
                    <div className="border-b border-[#eee4da] pb-5">
                      <p className="font-serif text-[1.05rem] leading-relaxed text-[#2b251f]">
                        “{memory.message}”
                        <span className="ml-2 whitespace-nowrap font-sans text-sm font-bold text-[#5f5145]">
                          — {memory.name || "Anonymous"}
                        </span>
                      </p>

                      {memory.country && (
                        <p className="mt-2 text-xs font-medium text-[#9a8d82]">
                          {memory.country}
                        </p>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b7d70]">
                          Comments {memoryComments.length}
                        </p>

                        <button
                          onClick={() =>
                            setOpenCommentForms((prev) => ({
                              ...prev,
                              [memory.id]: !prev[memory.id],
                            }))
                          }
                          className="rounded-full border border-[#ded2c6] bg-white/70 px-3 py-1 text-xs font-bold text-[#6e6258] transition hover:border-[#9c7a4f] hover:text-[#1f1b16]"
                          type="button"
                        >
                          {openCommentForms[memory.id]
                            ? "Close"
                            : "Leave a comment"}
                        </button>
                      </div>

                      {memoryComments.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {memoryComments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-2xl bg-[#f7f1ea] px-4 py-3"
                            >
                              <p className="font-serif text-sm leading-relaxed text-[#2b251f]">
                                {comment.comment}
                              </p>

                              <p className="mt-1 text-xs font-bold text-[#8b7d70]">
                                — {comment.name || "Anonymous"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {openCommentForms[memory.id] && (
                        <div className="mt-3 space-y-2 rounded-[1.25rem] bg-[#fbf7f2] p-3">
                          <input
                            value={commentNames[memory.id] || ""}
                            onChange={(e) =>
                              setCommentNames((prev) => ({
                                ...prev,
                                [memory.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-[#ded2c6] bg-white px-3 py-2 text-xs outline-none focus:border-[#9c7a4f]"
                            placeholder="Your name"
                            type="text"
                          />

                          <textarea
                            value={commentTexts[memory.id] || ""}
                            onChange={(e) =>
                              setCommentTexts((prev) => ({
                                ...prev,
                                [memory.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-[#ded2c6] bg-white px-3 py-2 text-xs outline-none focus:border-[#9c7a4f]"
                            placeholder="Leave a comment..."
                            rows={2}
                          />

                          <button
                            onClick={() => handleCommentSubmit(memory.id)}
                            disabled={commentLoading[memory.id]}
                            className="w-full rounded-full bg-[#1f1b16] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8a642f] transition disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                          >
                            {commentLoading[memory.id]
                              ? "Posting..."
                              : "Post Comment"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Upload Form */}
      <section id="upload" className="bg-[#efe5db] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-sm tracking-[0.28em] uppercase text-[#9c7a4f]">
              Add Your Story
            </p>

            <h2 className="text-4xl md:text-5xl font-semibold">
              Add Your Memory
            </h2>

            <p className="mt-4 text-[#6e6258]">
              Upload one photo and a few words from your stay.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] md:rounded-[2.5rem] bg-white/80 p-5 sm:p-8 md:p-12 shadow-xl border border-white"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block">
                <span className="text-sm font-semibold text-[#6e6258]">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ded2c6] bg-white px-4 py-3 outline-none focus:border-[#9c7a4f]"
                  placeholder="Your name"
                  type="text"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#6e6258]">
                  Country
                </span>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ded2c6] bg-white px-4 py-3 outline-none focus:border-[#9c7a4f]"
                  placeholder="Your country"
                  type="text"
                />
              </label>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-[#6e6258]">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#ded2c6] bg-white px-4 py-3 outline-none focus:border-[#9c7a4f]"
                placeholder="Tell us your story..."
                rows={4}
              />
            </label>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-[#6e6258]">
                Photo
              </span>

              <div className="mt-2 rounded-2xl border border-dashed border-[#cbbbaa] bg-white px-4 py-4">
                <input
                  key={fileInputKey}
                  id="memory-photo"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="hidden"
                  type="file"
                  accept="image/*"
                />

                <label
                  htmlFor="memory-photo"
                  className="inline-flex cursor-pointer rounded-full bg-[#1f1b16] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#8a642f]"
                >
                  Choose Photo
                </label>

                <span className="ml-3 text-sm text-[#7c7066]">
                  {photo ? photo.name : "No photo selected"}
                </span>
              </div>
            </label>

            <button
              disabled={loading}
              className="mt-8 w-full rounded-full bg-[#1f1b16] px-8 py-4 font-semibold text-white hover:bg-[#8a642f] transition disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
            >
              {loading ? "Submitting..." : "Submit Memory"}
            </button>

            <p className="mt-4 text-center text-sm text-[#7c7066]">
              Your photo and message will be publicly visible after submission.
            </p>

            {notice && (
              <p className="mt-5 rounded-2xl bg-[#f7efe7] px-4 py-3 text-center text-sm text-[#5f5145]">
                {notice}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center text-[#6e6258]">
        <p className="font-semibold text-[#1f1b16]">Friends Hostel Astana</p>

        <p className="mt-2">
          Memories shared by travelers from around the world.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-6">
          <a
            href="https://www.instagram.com/friends_hostel_astana/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1f1b16] transition"
          >
            Instagram
          </a>

          <a
            href="https://www.google.com/maps/search/Friends+Hostel+Astana"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1f1b16] transition"
          >
            Location
          </a>
        </div>

        <div className="mx-auto mt-8 max-w-3xl border-t border-[#ded2c6] pt-6 text-xs leading-relaxed text-[#8b7d70]">
          <p className="font-semibold text-[#6e6258]">Community Notice</p>

          <p className="mt-3">
            This non-profit memory wall is created for Friends Hostel Astana to
            preserve shared travel moments and community memories.
          </p>

          <p className="mt-3">
            By submitting a photo or message, you agree that it may be publicly
            displayed on this website. If you would like your content removed,
            please contact us on WhatsApp:
            <a
              href="https://wa.me/60173734059"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-semibold text-[#6e6258] underline underline-offset-4 hover:text-[#1f1b16]"
            >
              +60 17 373 4059
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}