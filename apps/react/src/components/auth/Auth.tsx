import { AuthForm } from './AuthForm.js';
import { AuthOutput } from './AuthOutput.js';
import { AuthCode } from './AuthCode.js';
import { Section, SectionTitle } from '../Section.js';
import { isMobile } from '@lib/nav.js';

export const Auth = () => {
  return (
    <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <SectionTitle>Write Once, Use Everywhere</SectionTitle>
      <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto">
        No providers, no context, no boilerplate. Declare your state once and use it anywhere in your application with
        simple syntax. Share state seamlessly across components.
      </p>
      <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-12 gap-4 w-full mt-10">
        <AuthForm className="md:col-span-5" />
        {!isMobile() && (
          <div className="flex flex-col gap-4 md:col-span-7">
            <AuthOutput />
            <AuthCode />
          </div>
        )}
      </div>
    </Section>
  );
};
