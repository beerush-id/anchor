import { Footer } from '@components/Footer';
import { BeyondFrontend } from './home/BeyondFrontend';
import { CoreFeatures } from './home/CoreFeatures';
import { EditorDemo } from './home/EditorDemo';
import { FrameworkAgnostic } from './home/FrameworkAgnostic';
import { Performance } from './home/Performance';
import { RedefineReact } from './home/RedefineReact';
import { ReimagineState } from './home/ReimagineState';
import { TodoDemo } from './home/TodoDemo';

export default function Home() {
  return (
    <main>
      <RedefineReact />
      <ReimagineState />
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
