import { Hero } from './home/Hero';
import { Performance } from './home/Performance';
import { CoreFeatures } from './home/CoreFeatures';
import { TodoDemo } from './home/TodoDemo';
import { EditorDemo } from './home/EditorDemo';
import { BeyondFrontend } from './home/BeyondFrontend';
import { Footer } from '@components/Footer';
import { RedefineReact } from './home/RedefineReact';
import { FrameworkAgnostic } from './home/FrameworkAgnostic';

export default function Home() {
  return (
    <main>
      <Hero />
      <RedefineReact />
      <CoreFeatures />
      <FrameworkAgnostic />
      <Performance />
      <TodoDemo />
      <BeyondFrontend />
      <EditorDemo />
      <Footer />
    </main>
  );
}
