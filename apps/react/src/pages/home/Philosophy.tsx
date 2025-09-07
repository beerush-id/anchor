import { Section } from '@components/Section.js';
import { Blocks, Braces, Database, GitCompare, UserCheck } from 'lucide-react';
import { MainCTA } from '@components/MainCTA.js';
import { BASE_PATH } from '@lib/nav.js';

export const Philosophy = () => {
  return (
    <Section id="philosophy" className="max-w-6xl mx-auto px-4 gap-6 flex flex-col">
      <div className="text-center md:mb-12">
        <h2 className="text-4xl md:text-6xl font-light text-white mb-6 leading-tight tracking-tighter">
          Anchor Philosophy - The DSV & AX Models
        </h2>
        <p className="section-subtitle text-slate-300 text-lg">
          Anchor isn't just a library. It's a new way to build. We've replaced the chaotic "Data-UI" flow with a unified
          model that scales with your ambition and delights both developers and users.{' '}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl mx-auto">
        <div className="card p-6 md:p-12 md:col-span-7 flex flex-col gap-4">
          <h3 className="text-2xl font-light">Data-State-View Model (DSV)</h3>
          <p className="text-slate-400">
            The DSV model introduces a simple, logical flow that makes your entire application easy to reason about.
          </p>
          <ul className="flex flex-col gap-3 mt-4">
            <li className="flex items-start gap-4">
              <div className="icon py-1">
                <Database className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-slate-300 text-lg font-medium">Data</h4>
                <p className="text-slate-400">
                  The origin of all information, from APIs to local storage. Anchor’s utilities seamlessly bind to it.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="icon py-1">
                <GitCompare className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-slate-300 text-lg font-medium">State</h4>
                <p className="text-slate-400">
                  The core of the DSV model. A single, stable source of truth that is immutable, strongly typed, and a
                  direct representation of your app.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="icon py-1">
                <Blocks className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-slate-300 text-lg font-medium">View</h4>
                <p className="text-slate-400">
                  The UI components simply read from the state. They have no data management logic, ensuring a clear
                  separation of concerns.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="card overflow-clip md:col-span-5">
          <img
            src={`${BASE_PATH}/images/illustrations/dsv.webp`}
            alt="DSV (Data-State-View) Illustration"
            className="object-cover object-center w-full h-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl mx-auto">
        <div className="card overflow-clip md:col-span-5">
          <img
            src={`${BASE_PATH}/images/illustrations/ax.webp`}
            alt="AX (All eXperience) Illustration"
            className="object-cover object-center w-full h-full"
          />
        </div>
        <div className="card p-6 md:p-12 md:col-span-7 flex flex-col gap-4">
          <h3 className="text-2xl font-light">The All eXperience (AX) Philosophy</h3>
          <p className="text-slate-400">
            We believe that when we improve the developer experience, we inherently improve the user experience.
          </p>
          <ul className="flex flex-col gap-3 mt-4">
            <li className="flex items-start gap-4">
              <div className="icon py-1">
                <Braces className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-slate-300 text-lg font-medium">Developer eXperience (DX)</h4>
                <p className="text-slate-400">
                  We've designed our APIs to be intuitive, efficient, and easy to use. Experience true immutability
                  without boilerplate, with direct mutation. Clean code with a clear data flow, data integrity with
                  schema.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="icon py-1">
                <UserCheck className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-slate-300 text-lg font-medium">User eXperience (UX)</h4>
                <p className="text-slate-400">
                  Experience a smooth, responsive UI that never stutters. Fast, fluid, and predictable user actions.
                  Reactive data updates and optimistic UI.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <MainCTA className="my-10 md:my-20" />
    </Section>
  );
};
