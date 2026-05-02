"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "sweetalert2";

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        setJob(res.data);
      } catch (error) {
        console.error("Failed to fetch job details");
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'Missing file', text: 'Please select a resume (PDF)' });
      return;
    }

    setApplying(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      await api.post(`/applications/${id}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      Swal.fire({ icon: 'success', title: 'Success', text: 'Application submitted successfully! Our AI is evaluating your resume.' });
      router.push("/dashboard");
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || "Application failed" });
    } finally {
      setApplying(false);
    }
  };

  if (!job) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{job.title}</CardTitle>
          <p className="text-lg font-medium text-slate-700">{job.company}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-slate-600 whitespace-pre-line">{job.description}</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill: string) => (
                <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          {user?.role !== "Recruiter" && (
            <div className="pt-6 border-t mt-6">
              <h3 className="font-semibold text-lg mb-4">Apply for this position</h3>
              <form onSubmit={handleApply} className="space-y-4">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <Button type="submit" disabled={applying} className="w-full cursor-pointer">
                  {applying ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
