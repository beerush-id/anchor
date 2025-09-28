import { Hero } from './home/Hero';
import { About } from './home/About';
import { CoreFeatures } from './home/CoreFeatures';
import { Performance } from './home/Performance';

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <CoreFeatures />
      <Performance />
    </main>
  );
}
