"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/jobs");
        setJobs(res.data);
      } catch (error) {
        console.error("Failed to fetch jobs");
      }
    };
    fetchJobs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Open Roles</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <Card key={job._id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <p className="text-sm text-slate-500">{job.company}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex flex-wrap gap-2 mb-4">
                {job.skills.slice(0, 3).map((skill: string) => (
                  <span key={skill} className="px-2 py-1 bg-slate-100 text-xs rounded-full text-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-600 line-clamp-3 mb-6 flex-1">
                {job.description}
              </p>
              <Link href={`/jobs/${job._id}`} className="mt-auto">
                <Button className="w-full cursor-pointer">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
