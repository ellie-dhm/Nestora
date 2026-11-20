export default function PropertyCardSkeleton() {
  return (
    <div className="card skeleton" aria-hidden="true">
      <div className="card-img-placeholder" />
      <div className="card-body">
        <div className="sk-line w-40" />
        <div className="sk-line w-80" />
        <div className="sk-line w-60" />
      </div>
    </div>
  );
}
