import { Hero } from './home/Hero';
import { About } from './home/About';
import { CoreFeatures } from './home/CoreFeatures';
import { Performance } from './home/Performance';
import { TodoDemo } from './home/TodoDemo';
import { EditorDemo } from './home/EditorDemo';
import { BeyondFrontend } from './home/BeyondFrontend';
import { Footer } from '@components/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <CoreFeatures />
      <Performance />
      <TodoDemo />
      <BeyondFrontend />
      <EditorDemo />
      <Footer />
    </main>
  );
}
