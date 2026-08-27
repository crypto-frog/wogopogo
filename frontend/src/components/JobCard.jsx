import { Link } from 'react-router-dom'
import { timeAgo } from '../util.js'

export default function JobCard({ job }) {
  const featured = job.tier === 'featured'
  return (
    <Link to={`/job/${job.id}`} className={'card' + (featured ? ' card-featured' : '')}>
      <div className="card-top">
        <span className="card-cat">
          <span aria-hidden="true">{job.category.emoji}</span> {job.category.name}
        </span>
        {featured ? (
          <span className="badge-featured mono">Featured</span>
        ) : (
          <span className="card-time mono">{timeAgo(job.created_at)}</span>
        )}
      </div>
      <h3 className="card-title">{job.title}</h3>
      <p className="card-company">{job.company}</p>
      {job.excerpt && <p className="card-excerpt">{job.excerpt}</p>}
      <p className="card-meta mono">
        {job.location} <span className="dot">·</span> {job.job_type}
        {job.pay ? (
          <>
            {' '}
            <span className="dot">·</span> {job.pay}
          </>
        ) : null}
      </p>
      {featured ? <span className="card-time mono card-time-featured">{timeAgo(job.created_at)}</span> : null}
    </Link>
  )
}

export function JobCardSkeleton() {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <span className="skeleton-line skeleton-line-short" />
      <span className="skeleton-line skeleton-line-title" />
      <span className="skeleton-line skeleton-line-company" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line-medium" />
      <span className="skeleton-line skeleton-line-meta" />
    </div>
  )
}
