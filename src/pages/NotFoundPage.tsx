import { Search } from 'lucide-react';
import { Link } from 'react-router';
import { Blueprint, Corners } from '../components/Blueprint';

export default function NotFoundPage() {
  return (
    <div className="page placeholder">
      <div>
        <div className="kicker">Page not found</div>
        <h1>We couldn't find that page</h1>
      </div>
      <Blueprint className="card">
        <p className="card-body">The link may be old, or the room may have been taken down.</p>
        <div>
          <Link to="/" className="btn btn-primary blueprint">
            <Corners />
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            Find a room
          </Link>
        </div>
      </Blueprint>
    </div>
  );
}
