const testimonials = [
  { quote: 'We stopped losing decisions in chat. The whole team can see what matters and what happens next.', name: 'Maya Chen', role: 'Founder, Fieldnotes' },
  { quote: 'It gives our week a shape without making planning feel like another job.', name: 'Jordan Lee', role: 'Operations lead, Studio North' },
  { quote: 'The calmest place we have found to keep a growing team on the same page.', name: 'Sam Rivera', role: 'Product lead, Relay' },
];

export function Testimonials() {
  return (
    <section className="border-y border-slate-200 bg-[#eef3ef] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-emerald-800">Made for thoughtful teams</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">A little more clarity changes the week.</h2></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="flex min-h-64 flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7">
              <p className="text-lg leading-8 text-slate-800">“{testimonial.quote}”</p>
              <div className="mt-8 border-t border-slate-100 pt-5"><p className="font-semibold">{testimonial.name}</p><p className="mt-1 text-sm text-slate-500">{testimonial.role}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
