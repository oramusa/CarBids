export default function SubmittedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Thanks — it&apos;s in review</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll email you once your listing is approved and an auction is
        scheduled. In this MVP, approval + auction scheduling is a manual
        step — see README.md for how to approve a listing yourself while
        testing.
      </p>
    </div>
  );
}
