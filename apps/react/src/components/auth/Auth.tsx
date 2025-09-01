import { AuthForm } from './AuthForm.js';
import { AuthOutput } from './AuthOutput.js';
import { AuthCode } from './AuthCode.js';
import { useAnchor } from '@anchor/react';
import { Section, SectionTitle } from '../Section.js';

export const Auth = () => {
  const [formData] = useAnchor({ name: '', email: '', password: '' });

  return (
    <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <SectionTitle>Write Once, Use Everywhere</SectionTitle>
      <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto">
        No providers, no context, no boilerplate. Declare your state once and use it anywhere in your application with
        simple syntax. Share state seamlessly across components.
      </p>
      <div className="grid md:grid-cols-12 gap-4 w-full mt-10">
        <AuthForm className="col-span-5" formData={formData} />
        <div className="flex flex-col gap-4 col-span-7">
          <AuthOutput formData={formData} />
          <AuthCode />
        </div>
      </div>
    </Section>
  );
};
