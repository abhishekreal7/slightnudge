import { cn } from '@/lib/cn';

const questions = [
  { question: 'Can we try Northstar before paying?', answer: 'Yes. The Free plan includes the core planning tools and does not require a card.', featured: true },
  { question: 'Can I invite my whole team?', answer: 'You can invite teammates to a shared workspace and decide together when to move to Team.', featured: false },
  { question: 'Can I leave whenever I want?', answer: 'Yes. You can cancel a paid plan at any time, and your workspace stays available through the billing period.', featured: false },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-10">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div><p className="text-sm font-semibold text-emerald-800">Good to know</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">A few useful answers.</h2></div>
        <div className="space-y-3">
          {questions.map((item) => (
            <article key={item.question} className={cn('rounded-2xl border border-slate-200 bg-white p-6', item.featured && 'border-emerald-200 bg-emerald-50/60')}>
              <h3 className="font-semibold tracking-tight">{item.question}</h3>
              <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
