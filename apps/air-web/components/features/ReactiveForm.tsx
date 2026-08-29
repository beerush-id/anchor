import { Link, setup } from '@airlib/react';
import { formIndexRoute } from '../../pages/(docs)/form/route.js';
import ReactiveFormDemo from './ReactiveFormDemo.mdx';

/**
 * Landing page feature section for AirLib Form.
 * Demonstrates zero-boilerplate, schema-driven form validation and fine-grained reactive updates.
 *
 * @returns ReactiveForm landing section component.
 */
export const ReactiveForm = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Form</span>
            <h2 className="air-feature-title">Schema-Driven Forms</h2>
            <p className="air-feature-body">
              AirLib Form lets you build forms that behave like native HTML forms without inventing artificial form
              actions or complex state machines. Compose your fields around a schema, and validation, error states, and
              dirty tracking handle themselves naturally.
            </p>
            <p className="air-feature-body">
              Submissions deliver clean, validated payloads and change sets directly to your handler. You get standard
              form ergonomics and effortless multi-step workflows without synthetic abstractions or wiring overhead.
            </p>
            <Link to={formIndexRoute} className="air-feature-more">
              Learn reactive forms &rarr;
            </Link>
          </div>

          <div className="air-mdx air-feature-demo">
            <ReactiveFormDemo />
          </div>
        </div>
      </div>
    </section>
  );
});
