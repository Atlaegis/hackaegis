"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      phone: (formData.get("phone") as string) || "",
      college: formData.get("college") as string,
      university: (formData.get("university") as string) || "",
      degree: (formData.get("degree") as string) || "",
      branch: (formData.get("branch") as string) || "",
      graduationYear: (formData.get("graduationYear") as string)
        ? Number(formData.get("graduationYear"))
        : undefined,
      githubUrl: (formData.get("githubUrl") as string) || "",
      linkedinUrl: (formData.get("linkedinUrl") as string) || "",
      skills: ((formData.get("skills") as string) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      city: (formData.get("city") as string) || "",
      state: (formData.get("state") as string) || "",
    };

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Something went wrong");
        return;
      }

      router.push("/dashboard/participant");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-white">Complete Your Profile</h1>
        <p className="mt-2 text-gray-400">
          Fill in your details to get started with HackAegis.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <InputField
              label="Full Name"
              name="fullName"
              required
              defaultValue={user?.fullName || ""}
              placeholder="Your full name"
            />
            <InputField
              label="Phone"
              name="phone"
              type="tel"
              placeholder="9876543210"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <InputField
              label="College"
              name="college"
              required
              placeholder="Your college name"
            />
            <InputField
              label="University"
              name="university"
              placeholder="Your university"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <InputField label="Degree" name="degree" placeholder="B.Tech" />
            <InputField label="Branch" name="branch" placeholder="CSE" />
            <InputField
              label="Graduation Year"
              name="graduationYear"
              type="number"
              placeholder="2026"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <InputField
              label="GitHub URL"
              name="githubUrl"
              placeholder="https://github.com/username"
            />
            <InputField
              label="LinkedIn URL"
              name="linkedinUrl"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <InputField
            label="Skills (comma separated)"
            name="skills"
            placeholder="React, Node.js, Python, AI/ML"
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <InputField label="City" name="city" placeholder="Pune" />
            <InputField label="State" name="state" placeholder="Maharashtra" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Complete Profile & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-orange-400 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
    </div>
  );
}
