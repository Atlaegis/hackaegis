"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CurrentEvent {
  id: string;
  title: string;
  slug: string;
}

export default function SubmissionPage() {
  const router = useRouter();
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch("/api/events/current");
        if (!res.ok) {
          setEventError("No active event found. Please contact an organizer.");
          return;
        }
        const event = await res.json();
        setCurrentEvent(event);
      } catch {
        setEventError("Failed to load event. Please try again.");
      } finally {
        setEventLoading(false);
      }
    }
    fetchEvent();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!currentEvent) {
      setError("No active event found.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      projectTitle: formData.get("projectTitle") as string,
      projectDescription: formData.get("projectDescription") as string,
      githubUrl: formData.get("githubUrl") as string,
      deploymentUrl: (formData.get("deploymentUrl") as string) || "",
      demoVideoUrl: (formData.get("demoVideoUrl") as string) || "",
      pptUrl: (formData.get("pptUrl") as string) || "",
    };

    try {
      const res = await fetch(`/api/events/${currentEvent.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Submission failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (eventLoading) {
    return <p className="text-gray-400">Loading event...</p>;
  }

  if (eventError) {
    return (
      <div className="rounded-lg bg-red-900/50 border border-red-700 p-4 text-sm text-red-300">
        {eventError}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Submit Your Project</h1>
      <p className="mt-2 text-gray-400">
        Provide links to your project deliverables. All fields marked with * are required.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-900/50 border border-green-700 p-3 text-sm text-green-300">
          Submission successful! You can view your evaluation status on the Transparency page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Project Title <span className="text-orange-400">*</span>
          </label>
          <input
            name="projectTitle"
            required
            minLength={3}
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="e.g. AI-Powered Fraud Detection System"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Project Description <span className="text-orange-400">*</span>
          </label>
          <textarea
            name="projectDescription"
            required
            minLength={20}
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="Describe your project, the problem it solves, and your approach..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            GitHub Repository URL <span className="text-orange-400">*</span>
          </label>
          <input
            name="githubUrl"
            required
            type="url"
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="https://github.com/your-team/your-project"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Live Deployment URL
          </label>
          <input
            name="deploymentUrl"
            type="url"
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="https://your-project.vercel.app"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Demo Video URL
          </label>
          <input
            name="demoVideoUrl"
            type="url"
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            PPT / Documentation URL
          </label>
          <input
            name="pptUrl"
            type="url"
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            placeholder="https://docs.google.com/presentation/d/..."
          />
          <p className="mt-1 text-xs text-gray-600">Google Slides, Canva, or any public link to your presentation.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Submitting..." : "Submit Project"}
        </button>
      </form>
    </div>
  );
}
