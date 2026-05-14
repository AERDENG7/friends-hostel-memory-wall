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

export default function HomePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

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

    setMemories(data || []);
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
await loadMemories();
setNotice("Thank you. Your memory has been shared on the wall.");
    } catch (error) {
      console.error("Submit memory error:", error);
      setNotice("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
        <div className="mb-14 text-center">
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
            No approved memories yet. Be the first to share one.
          </div>
        ) : (
          <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
            {memories.map((memory) => (
              <article
                key={memory.id}
                className="mb-6 break-inside-avoid rounded-[2rem] bg-white p-4 shadow-sm border border-[#eadfd5]"
              >
                {memory.photo_url && (
                  <img
                    src={memory.photo_url}
                    alt={memory.message}
                    className="mb-5 w-full rounded-[1.5rem] object-cover"
                  />
                )}

                <div className="px-2 pb-2">
                  <p className="text-lg leading-relaxed text-[#2b251f]">
                    “{memory.message}”
                  </p>

                  <div className="mt-5 border-t border-[#eee4da] pt-4">
                    <p className="font-semibold">
                      {memory.name || "Anonymous"}
                    </p>

                    {memory.country && (
                      <p className="text-sm text-[#7c7066]">
                        {memory.country}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
              <input
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="mt-2 w-full rounded-2xl border border-dashed border-[#cbbbaa] bg-white px-4 py-4"
                type="file"
                accept="image/*"
              />
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

    <div className="mx-auto mt-8 max-w-3xl border-t border-[#ded2c6] pt-6 text-xs leading-relaxed text-[#8b7d70]">
  <p className="font-semibold text-[#6e6258]">Community Notice / 社区声明</p>

  <p className="mt-3">
    This non-profit memory wall is created for Friends Hostel Astana to
    preserve shared travel moments and community memories.
  </p>

  <p className="mt-2">
    这个非盈利回忆墙是为 Friends Hostel Astana 创建的，用于保存旅行者共同的回忆和社区瞬间。
  </p>

  <p className="mt-3">
    By submitting a photo or message, you agree that it may be publicly
    displayed on this website. If you would like your content removed, please
    contact us on WhatsApp.
  </p>

  <p className="mt-2">
    提交照片或留言即表示你同意内容可能会公开显示在本网站上。如需删除你的内容，请通过 WhatsApp 联系我们：
    <a
      href="https://wa.me/60173734059"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#6e6258] underline underline-offset-4 hover:text-[#1f1b16]"
    >
      +60 17 373 4059
    </a>
  </p>
</div>
    </main>
  );
}