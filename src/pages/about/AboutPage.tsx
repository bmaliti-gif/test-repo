import { BadgeCheck, Lock, MessageSquareQuote, Search } from 'lucide-react';
import { Link } from 'react-router';

/** About CabinHub: how it works and why it's safe (moved here from the search page). */
export default function AboutPage() {
  return (
    <div className="page about-page">
      <div>
        <div className="kicker">About CabinHub</div>
        <h1>Rooms near campus in Lusaka, straight from landlords</h1>
        <p className="lede muted">
          CabinHub helps students and young professionals find a room without paying an agent. Landlords list for a
          small fee, and your deposit stays safe until you move in.
        </p>
      </div>

      <section aria-labelledby="how-heading" className="about-section">
        <h2 id="how-heading">How it works</h2>
        <ol className="how-card about-steps">
          <li>
            <span className="how-num">1</span>
            <span>
              <strong>Find and compare</strong> rooms near your campus, with real reviews.
            </span>
          </li>
          <li>
            <span className="how-num">2</span>
            <span>
              <strong>Reserve with mobile money.</strong> CabinHub holds your deposit, not the landlord.
            </span>
          </li>
          <li>
            <span className="how-num">3</span>
            <span>
              <strong>Move in,</strong> then confirm. Only then is the deposit released.
            </span>
          </li>
        </ol>
      </section>

      <section aria-labelledby="trust-heading" className="about-section">
        <h2 id="trust-heading">Why you can trust it</h2>
        <ul className="about-trust">
          <li>
            <BadgeCheck size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>ID-checked landlords.</strong> Our team checks each landlord's NRC and proof they can let the room
              before they get the Verified badge.
            </span>
          </li>
          <li>
            <Lock size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Deposit held by CabinHub.</strong> If the room isn't as listed, report it and you get your money
              back. <Link to="/refunds">How refunds work</Link>
            </span>
          </li>
          <li>
            <MessageSquareQuote size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Reviews from real tenants.</strong> Only people who reserved and moved in can review a room.
            </span>
          </li>
        </ul>
      </section>

      <div>
        <Link to="/" className="btn btn-primary">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          Find a room
        </Link>
      </div>
    </div>
  );
}
