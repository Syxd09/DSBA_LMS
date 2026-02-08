import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Award, Shield, BarChart3, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export default function Index() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-lg">EduMetrics</h1>
              <p className="text-xs text-muted-foreground">Academic Excellence Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Transform Academic Evaluation with
            <span className="text-primary block mt-2">Outcome-Based Learning</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive platform for managing internal examinations, Bloom's taxonomy analysis, 
            CO-PO attainment tracking, and advanced academic analytics.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything You Need for Academic Excellence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BookOpen}
              title="OBE Compliant"
              description="Full Outcome-Based Education support with comprehensive CO-PO mapping and curriculum versioning."
            />
            <FeatureCard
              icon={Award}
              title="Bloom's Taxonomy"
              description="Question-level cognitive level analysis and tracking across all six levels of learning."
            />
            <FeatureCard
              icon={BarChart3}
              title="Advanced Analytics"
              description="Real-time dashboards for students, teachers, HODs, and principals with predictive insights."
            />
            <FeatureCard
              icon={Users}
              title="Role-Based Access"
              description="Secure, role-specific portals for all stakeholders with appropriate permissions."
            />
            <FeatureCard
              icon={Shield}
              title="Audit Ready"
              description="Immutable snapshots, complete audit trails, and compliance-ready transcripts."
            />
            <FeatureCard
              icon={GraduationCap}
              title="Student Insights"
              description="Personalized recommendations, weak area identification, and progress tracking."
            />
          </div>
        </div>
      </section>

      {/* Role Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-4">
            Designed for Every Role
          </h3>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Tailored experiences for all academic stakeholders
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard
              role="Principal"
              features={['Institution-wide analytics', 'Department comparisons', 'User management', 'Curriculum approval']}
            />
            <RoleCard
              role="HOD"
              features={['Department oversight', 'Teacher management', 'Subject allocation', 'At-risk student tracking']}
            />
            <RoleCard
              role="Teacher"
              features={['Exam structure builder', 'Marks entry grid', 'Class analytics', 'CO-Bloom mapping']}
            />
            <RoleCard
              role="Student"
              features={['Detailed results', 'Performance trends', 'Bloom analysis', 'AI recommendations']}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Transform Your Institution?
          </h3>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join hundreds of colleges already using EduMetrics for outcome-based academic excellence.
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
            Get Started Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2024 EduMetrics. Comprehensive Academic Evaluation Platform.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return (
    <div className="p-6 border border-border bg-background">
      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h4 className="text-lg font-semibold text-foreground mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function RoleCard({ role, features }: { role: string; features: string[] }) {
  return (
    <div className="p-6 border border-border bg-card">
      <h4 className="text-lg font-semibold text-foreground mb-4">{role}</h4>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
