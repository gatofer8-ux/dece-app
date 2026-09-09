"use client";

import { useState, useMemo } from "react";

export default function SearchableStudentSelect({
  students,
  defaultValue = "",
  name = "student_id"
}: {
  students: { id: string; full_name: string; course?: string | null; parallel?: string | null }[];
  defaultValue?: string;
  name?: string;
}) {
  const [search, setSearch] = useState("");
  const [value, setValue] = useState(defaultValue);

  const selectedStudent = useMemo(() => students.find(s => s.id === value), [students, value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students.slice(0, 50); // limit empty search to 50
    const lower = search.toLowerCase();
    return students.filter(s => 
      s.full_name.toLowerCase().includes(lower) || 
      (s.course && s.course.toLowerCase().includes(lower))
    ).slice(0, 50);
  }, [students, search]);

  return (
    <div className="relative flex flex-col gap-2">
      <input type="hidden" name={name} value={value} required />
      
      {selectedStudent ? (
        <div className="flex items-center justify-between p-2.5 bg-brand-50 border border-brand-200 rounded-md">
          <div className="text-sm font-medium text-brand-900">
            {selectedStudent.full_name} - {selectedStudent.course} {selectedStudent.parallel || ""}
          </div>
          <button 
            type="button" 
            onClick={() => { setValue(""); setSearch(""); }}
            className="text-brand-700 hover:text-brand-900 px-2 font-bold"
          >
            × Cambiar
          </button>
        </div>
      ) : (
        <div className="border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-brand-500 overflow-hidden bg-white">
          <input
            type="text"
            className="w-full p-2.5 text-sm outline-none"
            placeholder="Escribe para buscar un estudiante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto border-t border-slate-200">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No hay coincidencias</div>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setValue(s.id)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 focus:bg-slate-100 outline-none"
                >
                  <div className="text-sm font-medium text-slate-900">{s.full_name}</div>
                  <div className="text-xs text-slate-500">{s.course} {s.parallel || ""}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
