"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "sweetalert2";
import { Trash2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recruiter specific state
  const [newJob, setNewJob] = useState({ title: "", description: "", skills: "", company: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();

    // Listen for real-time socket events to update the UI automatically
    const handleMatchCompleted = () => {
      fetchData(); // Re-fetch the dashboard data
    };

    import("@/lib/socket").then(({ socket }) => {
      socket.on("match-completed", handleMatchCompleted);
    });

    return () => {
      import("@/lib/socket").then(({ socket }) => {
        socket.off("match-completed", handleMatchCompleted);
      });
    };
  }, [user]);

  const fetchData = async () => {
    try {
      if (user.role === "Recruiter") {
        const res = await api.get("/jobs"); // We should filter by creator ideally, but API returns all. For demo we assume they see their jobs, but wait API returns all jobs! Let's just show them all jobs for now or filter.
        // Let's get jobs created by user. Actually let's just fetch all jobs and filter.
        const allJobs = res.data.filter((j: any) => j.createdBy === user._id);
        
        // Also fetch applications for each job
        const jobsWithApps = await Promise.all(allJobs.map(async (job: any) => {
          const appsRes = await api.get(`/applications/job/${job._id}`);
          return { ...job, applications: appsRes.data };
        }));
        setData(jobsWithApps);
      } else {
        const res = await api.get("/applications/user");
        setData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    try {
      await api.post("/jobs", {
        ...newJob,
        skills: newJob.skills.split(",").map(s => s.trim())
      });
      setNewJob({ title: "", description: "", skills: "", company: "" });
      fetchData();
      Swal.fire({ icon: 'success', title: 'Success', text: 'Job posted successfully', timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to post job' });
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this application deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/applications/${appId}`);
        Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Your application has been deleted.', timer: 1500, showConfirmButton: false });
        fetchData();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete application' });
      }
    }
  };

  if (!user) return <div>Please login to view dashboard.</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>

      {user.role === "Recruiter" ? (
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Post a New Job</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <Input placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
                <Input placeholder="Company" value={newJob.company} onChange={e => setNewJob({...newJob, company: e.target.value})} required />
                <Input placeholder="Skills (comma separated)" value={newJob.skills} onChange={e => setNewJob({...newJob, skills: e.target.value})} required />
                <textarea 
                  className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Job Description" rows={4}
                  value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} required 
                />
                <Button type="submit" disabled={posting} className="w-full cursor-pointer">
                  {posting ? "Posting..." : "Post Job"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your Posted Jobs & Candidates</h2>
            {data.length === 0 && <p className="text-slate-500">No jobs posted yet.</p>}
            {data.map((job) => (
              <Card key={job._id}>
                <CardHeader>
                  <CardTitle>{job.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">Applications ({job.applications?.length || 0})</p>
                  <div className="space-y-2">
                    {job.applications?.map((app: any) => (
                      <div key={app._id} className="p-3 bg-slate-50 rounded border flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{app.userId?.name}</p>
                          <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline cursor-pointer">View Resume</a>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                            Score: {app.matchScore ?? "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Applications</h2>
          {data.length === 0 && <p className="text-slate-500">You haven't applied to any jobs yet.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((app) => (
              <Card key={app._id}>
                <CardHeader className="flex flex-row justify-between items-start pt-6">
                  <div>
                    <CardTitle className="text-lg">{app.jobId?.title}</CardTitle>
                    <p className="text-sm text-slate-500">{app.jobId?.company}</p>
                  </div>
                  <button onClick={() => handleDeleteApplication(app._id)} className="text-red-400 hover:text-red-600 transition-colors cursor-pointer" title="Delete Application">
                    <Trash2 size={20} />
                  </button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-slate-600">Status: {app.status}</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${app.matchScore ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      Score: {app.matchScore ?? "Pending"}
                    </span>
                  </div>
                  {app.skillSummary && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-semibold mb-1">AI Feedback:</p>
                      <p className="text-xs text-slate-600 italic">{app.skillSummary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
