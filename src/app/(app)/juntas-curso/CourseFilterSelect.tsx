"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function CourseFilterSelect({
  courses,
  selectedCourse,
}: {
  courses: string[];
  selectedCourse?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("course", val);
    } else {
      params.delete("course");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={selectedCourse || ""}
      onChange={handleChange}
      className="text-xs border-slate-200 rounded-md py-1 px-2 bg-slate-50"
    >
      <option value="">Todos los cursos</option>
      {courses.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
