import { useMemo, useState } from 'react';
import { Check, CircleCheck, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { Loading, MessagePage, Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { useAuth, useMe } from '../../lib/auth';
import { matchScore } from '../../lib/match';
import { formatKwacha } from '../../lib/money';
import { whatsappLink } from '../../lib/payments';
import {
  MATE_CAMPUSES,
  mateCampusLabel,
  useRespondRequest,
  useRoommateContact,
  useRoommates,
  useSendRequest,
  useWithdrawRequest,
  type Mate,
  type Request,
} from '../../lib/roommates';
import { RoommateProfileDialog } from './RoommateProfileDialog';

const monthLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const budget = (m: { budget_min_ngwee: number; budget_max_ngwee: number }) =>
  `${formatKwacha(m.budget_min_ngwee)}–${formatKwacha(m.budget_max_ngwee).replace('K ', '')}`;
const firstName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || 'Member';
};

export default function RoommatesPage() {
  const { user } = useAuth();
  const { me } = useMe();
  const data = useRoommates();
  const toast = useToast();
  const respond = useRespondRequest();
  const [campus, setCampus] = useState<string>('all');
  const [editing, setEditing] = useState(false);

  const mine = data.data?.mine ?? null;
  const mates = useMemo(() => {
    const others = (data.data?.others ?? []).filter((m) => campus === 'all' || m.campus === campus);
    if (!mine) return others.map((m) => ({ mate: m, score: null as number | null }));
    return others
      .map((m) => ({ mate: m, score: matchScore(mine, m)?.total ?? null, excluded: matchScore(mine, m) === null }))
      .filter((x) => !x.excluded)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [data.data, campus, mine]);

  if (data.isPending) return <Loading label="Finding roommates…" />;
  if (data.isError || !data.data) {
    return (
      <MessagePage kicker="Split the rent" title="We couldn't load roommates">
        <p className="card-body">Check your internet connection, then try again.</p>
        <div>
          <Button variant="primary" onClick={() => data.refetch()}>
            Retry
          </Button>
        </div>
      </MessagePage>
    );
  }

  const { requests, names } = data.data;
  const incoming = requests.filter((r) => r.to_user === user?.id && r.status === 'pending');
  const requestWith = (otherId: string) => requests.find((r) => (r.from_user === user?.id && r.to_user === otherId) || (r.to_user === user?.id && r.from_user === otherId));

  async function answer(r: Request, accept: boolean) {
    try {
      await respond.mutateAsync({ requestId: r.id, accept });
      toast(accept ? 'Accepted. You can now message each other on WhatsApp.' : 'Request declined.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <div className="roommates-page">
      <div className="roommates-head">
        <div>
          <div className="kicker">Split the rent</div>
          <h1>Roommate matching</h1>
          <p className="lede muted">
            Matches are scored on budget, campus, move-in date and living habits. Only signed-in members can see profiles.
          </p>
        </div>
        <div className="seg seg-scroll" role="radiogroup" aria-label="Campus">
          {[{ id: 'all', label: 'All' }, ...MATE_CAMPUSES].map((c) => (
            <label key={c.id} className="seg-opt">
              <input type="radio" name="mate-campus" checked={campus === c.id} onChange={() => setCampus(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="roommates-top">
        <Blueprint as="section" className="card my-mate-card" aria-labelledby="my-profile-heading">
          <span className="card-kicker">My roommate profile</span>
          {mine ? (
            <>
              <h2 id="my-profile-heading" className="card-title">
                {mateCampusLabel(mine.campus)} · {budget(mine)} · from {monthLabel(mine.move_in_month)}
              </h2>
              <p className="card-body">
                {mine.visible ? 'Visible to other members.' : 'Hidden: others can’t see you or send requests.'}
                {mine.habits.length > 0 && ` ${mine.habits.join(' · ')}`}
              </p>
            </>
          ) : (
            <>
              <h2 id="my-profile-heading" className="card-title">
                Create your profile to see match scores
              </h2>
              <p className="card-body">Takes a minute: campus, budget, move-in month and how you live.</p>
            </>
          )}
          <div>
            <Button variant={mine ? 'secondary' : 'primary'} onClick={() => setEditing(true)}>
              <Pencil size={15} strokeWidth={1.5} aria-hidden="true" />
              {mine ? 'Edit my profile' : 'Create my profile'}
            </Button>
          </div>
        </Blueprint>

        {incoming.length > 0 && (
          <Blueprint as="section" className="card requests-card" aria-labelledby="requests-heading">
            <span className="card-kicker">Requests</span>
            <h2 id="requests-heading" className="card-title">
              {incoming.length} {incoming.length === 1 ? 'person wants' : 'people want'} to match with you
            </h2>
            <ul className="request-list">
              {incoming.map((r) => {
                const who = names.get(r.from_user);
                return (
                  <li key={r.id}>
                    <span>
                      <strong>{firstName(who?.full_name ?? '')}</strong>
                      {who?.headline && <span className="muted"> · {who.headline}</span>}
                    </span>
                    <span className="request-actions">
                      <Button variant="secondary" onClick={() => answer(r, false)} disabled={respond.isPending}>
                        Decline
                      </Button>
                      <Button variant="primary" onClick={() => answer(r, true)} disabled={respond.isPending}>
                        Accept
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Blueprint>
        )}
      </div>

      {mates.length === 0 ? (
        <Notice tone="info">
          No roommate profiles {campus === 'all' ? 'yet' : `at ${mateCampusLabel(campus)} yet`}. Create yours so others can
          find you, and check back soon.
        </Notice>
      ) : (
        <ul className="mate-grid">
          {mates.map(({ mate, score }) => (
            <MateCard key={mate.user_id} mate={mate} score={score} request={requestWith(mate.user_id)} myId={user?.id ?? ''} canRequest={Boolean(mine)} onNeedProfile={() => setEditing(true)} myName={me?.profile.full_name ?? ''} />
          ))}
        </ul>
      )}

      <RoommateProfileDialog open={editing} onClose={() => setEditing(false)} current={mine} defaultCampus={me?.profile.campus ?? null} />
    </div>
  );
}

type CardProps = {
  mate: Mate;
  score: number | null;
  request: Request | undefined;
  myId: string;
  myName: string;
  canRequest: boolean;
  onNeedProfile: () => void;
};

function MateCard({ mate, score, request, myId, myName, canRequest, onNeedProfile }: CardProps) {
  const send = useSendRequest();
  const withdraw = useWithdrawRequest();
  const toast = useToast();
  const accepted = request?.status === 'accepted';
  const contact = useRoommateContact(mate.user_id, accepted);
  const sentByMe = request?.from_user === myId;

  let action;
  if (accepted) {
    action = contact.data ? (
      <a
        className="btn btn-secondary"
        href={whatsappLink(contact.data, `Hi ${firstName(mate.full_name)}, it's ${myName || 'your BoardZM match'}. Shall we look for a room together?`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
        WhatsApp
      </a>
    ) : (
      <span className="mate-status">
        <CircleCheck size={15} strokeWidth={1.5} aria-hidden="true" /> Accepted{contact.isPending ? '' : ' · no WhatsApp number yet'}
      </span>
    );
  } else if (request?.status === 'pending' && sentByMe) {
    action = (
      <Button variant="secondary" onClick={() => withdraw.mutate(request.id)} disabled={withdraw.isPending} aria-label={`Request sent to ${mate.full_name}. Withdraw it`}>
        <Check size={15} strokeWidth={1.5} aria-hidden="true" />
        Request sent · Withdraw
      </Button>
    );
  } else if (request?.status === 'pending') {
    action = <span className="mate-status">Wants to match with you (see Requests above)</span>;
  } else if (request?.status === 'declined') {
    action = <span className="mate-status">Not a match this time</span>;
  } else {
    action = (
      <Button
        variant="primary"
        onClick={() => {
          if (!canRequest) return onNeedProfile();
          send.mutate(mate.user_id, { onSuccess: () => toast(`Request sent to ${firstName(mate.full_name)}.`) });
        }}
        disabled={send.isPending}
      >
        <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
        Request to match
      </Button>
    );
  }

  return (
    <Blueprint as="li" className="card mate-card">
      <div className="mate-top">
        <div className="mate-name">
          <span className="card-title">{firstName(mate.full_name)}</span>
          <span className="mate-role">{mate.headline || mateCampusLabel(mate.campus)}</span>
        </div>
        {score !== null && (
          <div className="mate-score" aria-label={`${score}% match`}>
            <span className="mate-score-value">{score}%</span>
            <span className="mate-score-label">match</span>
          </div>
        )}
      </div>
      {score !== null && (
        <div className="mate-bar" aria-hidden="true">
          <span style={{ width: `${score}%` }} />
        </div>
      )}
      <div className="mate-facts">
        <span>
          <span className="muted">Budget</span>
          <br />
          {budget(mate)}
        </span>
        <span>
          <span className="muted">Move-in</span>
          <br />
          {monthLabel(mate.move_in_month)}
        </span>
      </div>
      {mate.bio && <p className="mate-bio">{mate.bio}</p>}
      {mate.habits.length > 0 && (
        <div className="mate-tags">
          {mate.habits.map((h) => (
            <span key={h} className="tag tag-neutral">
              {h}
            </span>
          ))}
        </div>
      )}
      <div className="mate-action">{action}</div>
    </Blueprint>
  );
}
