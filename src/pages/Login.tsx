import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Shield, Users, BookOpen, Award } from 'lucide-react';

const roles: Array<{ role: UserRole; label: string; description: string; icon: typeof Shield }> = [
  { role: 'principal', label: 'Principal', description: 'Institutional oversight & management', icon: Shield },
  { role: 'hod', label: 'Head of Department', description: 'Department-level administration', icon: Users },
  { role: 'teacher', label: 'Teacher', description: 'Exam creation & marks entry', icon: BookOpen },
  { role: 'student', label: 'Student', description: 'View results & performance', icon: Award },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (selectedRole) {
      login(selectedRole);
      navigate('/dashboard');
    }
  };

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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Welcome to EduMetrics
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive academic evaluation platform with Outcome-Based Learning, 
            Bloom's Taxonomy analysis, and CO-PO attainment tracking.
          </p>
        </div>

        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Select Your Role</CardTitle>
            <CardDescription>
              Choose your role to access the appropriate portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map(({ role, label, description, icon: Icon }) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 text-left border transition-all ${
                    selectedRole === role
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 ${selectedRole === role ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleLogin}
              disabled={!selectedRole}
              className="w-full h-12 text-base mt-4"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-secondary mx-auto mb-4 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">OBE Compliant</h3>
            <p className="text-sm text-muted-foreground">
              Full Outcome-Based Education support with CO-PO mapping
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Award className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Bloom's Taxonomy</h3>
            <p className="text-sm text-muted-foreground">
              Question-level cognitive level analysis and tracking
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Audit Ready</h3>
            <p className="text-sm text-muted-foreground">
              Immutable records with complete audit trails
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2024 EduMetrics. Academic Excellence Platform.
        </div>
      </footer>
    </div>
  );
}
