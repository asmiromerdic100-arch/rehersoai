import { OnboardingForm } from './onboarding-form';

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to RehersoAI</h1>
        <p className="text-sm text-muted-foreground">
          Two quick questions so we can tailor your practice.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
