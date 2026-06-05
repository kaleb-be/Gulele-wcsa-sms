"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";

type Project = {
  project_id: string | number;
  project_title: string;
};

type Props = {
  projects: Project[];
  projectId: string;
  setProjectId: (value: string) => void;
};

export default function ProjectSearchSelect({
                                              projects,
                                              projectId,
                                              setProjectId,
                                            }: Props) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.project_id) === String(projectId)),
    [projects, projectId]
  );

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (selectedProject && !open) {
      setQuery(selectedProject.project_title);
    }
  }, [selectedProject, open]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      p.project_title.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const handleSelect = (project: Project | null) => {
    if (!project) {
      setProjectId("");
      setQuery("");
    } else {
      setProjectId(String(project.project_id));
      setQuery(project.project_title);
    }
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-[80%]">
      <input
        type="text"
        value={open ? query : selectedProject?.project_title ?? query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (!query && selectedProject) setQuery(selectedProject.project_title);
        }}
        placeholder={t("budget.selectProject")}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="w-full px-3 py-2 text-left text-sm whitespace-normal break-words hover:bg-gray-50"
          >
            {t("budget.allProjects")}
          </button>

          <div className="max-h-64 overflow-auto">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const active =
                  String(projectId) === String(project.project_id);

                return (
                  <button
                    key={project.project_id}
                    type="button"
                    onClick={() => handleSelect(project)}
                    className={`w-full px-3 py-2 text-left text-sm leading-5 whitespace-normal break-words hover:bg-blue-50 ${
                      active ? "bg-blue-100 text-blue-700" : "text-gray-800"
                    }`}
                  >
                    {project.project_title}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                {t("common.noData")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}