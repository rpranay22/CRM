import {
  useEffect,
  useState,
} from "react";

import { api } from "./api";
import "./styles.css";

function App() {
  const [page, setPage] = useState("dashboard");
  const [ticketUnread, setTicketUnread] = useState(0);

  useEffect(() => {
    function loadUnread() {
      api("/tickets/unread")
        .then((r) => setTicketUnread(r.total || 0))
        .catch(() => {});
    }
    loadUnread();
    const id = window.setInterval(loadUnread, 20000);
    return () => window.clearInterval(id);
  }, [page]);

  return (
    <div className="crm-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">W</div>

          <div>
            <h2>WattWatch</h2>
            <span>CRM Portal</span>
          </div>
        </div>

        <NavButton
          active={page === "dashboard"}
          onClick={() => setPage("dashboard")}
        >
          Dashboard
        </NavButton>

        <NavButton
          active={page === "leads"}
          onClick={() => setPage("leads")}
        >
          Leads
        </NavButton>

        <NavButton
          active={page === "customers"}
          onClick={() => setPage("customers")}
        >
          Customers
        </NavButton>

        <NavButton
          active={page === "tickets"}
          onClick={() => setPage("tickets")}
          badge={ticketUnread > 0 ? ticketUnread : null}
        >
          Tickets
        </NavButton>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>
              Customer Relationship Management
            </h1>

            <p>
              Manage leads, conversions and
              customer support.
            </p>
          </div>

          <div className="agent-profile">
            <div className="agent-avatar">A</div>

            <div>
              <strong>CRM Agent</strong>
              <small>Operations</small>
            </div>
          </div>
        </header>

        {page === "dashboard" && (
          <Dashboard />
        )}

        {page === "leads" && <Leads />}

        {page === "customers" && (
          <Customers />
        )}

        {page === "tickets" && <Tickets />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
  badge,
}) {
  return (
    <button
      className={
        active
          ? "nav-button active"
          : "nav-button"
      }
      onClick={onClick}
    >
      <span>{children}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

function Dashboard() {
  const [dashboard, setDashboard] =
    useState(null);

  const [error, setError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setDashboard)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <Message type="error">{error}</Message>;
  }

  if (!dashboard) {
    return <Message>Loading dashboard...</Message>;
  }

  const maximumProviderCount = Math.max(
    ...dashboard.providers.map(
      (provider) => provider.count
    ),
    1
  );

  return (
    <section className="page">
      <PageHeading
        title="Performance Overview"
        description="Current lead and customer activity."
      />

      <div className="metric-grid">
        <MetricCard
          label="New Leads"
          value={dashboard.totals.leads}
          text="Awaiting follow-up"
        />

        <MetricCard
          label="Customers"
          value={dashboard.totals.customers}
          text="Activated accounts"
        />

        <MetricCard
          label="Conversion Rate"
          value={`${dashboard.totals.conversionRate}%`}
          text="Lead conversion"
        />

        <MetricCard
          label="Open Tickets"
          value={dashboard.totals.openTickets}
          text="Require attention"
        />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h3>Recent Leads</h3>

          {dashboard.recentLeads.map(
            (lead) => (
              <div
                className="recent-row"
                key={lead.id}
              >
                <div className="customer-avatar">
                  {lead.firstName?.[0]}
                  {lead.lastName?.[0]}
                </div>

                <div className="grow">
                  <strong>
                    {lead.firstName}{" "}
                    {lead.lastName}
                  </strong>

                  <span>{lead.email}</span>
                </div>

                <Status status={lead.status} />
              </div>
            )
          )}

          {!dashboard.recentLeads.length && (
            <p>No leads found.</p>
          )}
        </div>

        <div className="panel">
          <h3>Leads by Provider</h3>

          {dashboard.providers.map(
            (provider) => (
              <div
                className="provider-row"
                key={provider.provider}
              >
                <div className="provider-label">
                  <span>{provider.provider}</span>
                  <strong>{provider.count}</strong>
                </div>

                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(provider.count /
                          maximumProviderCount) *
                        100
                        }%`,
                    }}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [issuedPassword, setIssuedPassword] = useState(null);

  async function loadLeads() {
    try {
      const result = await api(
        `/customers?status=LEAD&search=${encodeURIComponent(
          search
        )}`
      );

      setLeads(result.data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    const timer = setTimeout(
      loadLeads,
      300
    );

    return () => clearTimeout(timer);
  }, [search]);

  async function convertCustomer(lead) {
    const confirmed = window.confirm(
      `Convert ${lead.firstName} ${lead.lastName} to a customer and email a temporary password?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(lead.id);
      setError("");
      setMessage("");
      setIssuedPassword(null);

      const result = await api(
        `/customers/${lead.id}/convert`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (result.temporaryPassword) {
        setIssuedPassword({
          email: lead.email,
          password: result.temporaryPassword,
          provider: result.emailProvider,
        });
      }

      setMessage(
        result.emailProvider === "gmail"
          ? `Customer converted. Login email was sent through Gmail to ${lead.email}.`
          : `Customer converted. Copy the temporary password below. Gmail often hides Brevo mail from @gmail.com senders.`
      );

      await loadLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page">
      <PageHeading
        title="Lead Management"
        description="Review registrations and convert qualified leads."
      />

      <input
        className="search-input"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search name, email, Eircode or MPRN"
      />

      {issuedPassword && (
        <IssuedCredentials
          email={issuedPassword.email}
          password={issuedPassword.password}
        />
      )}

      {message && (
        <Message type="success">
          {message}
        </Message>
      )}

      {error && (
        <Message type="error">
          {error}
        </Message>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Electricity Details</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <strong>
                    {lead.firstName}{" "}
                    {lead.lastName}
                  </strong>

                  <small>
                    Lead #{lead.id}
                  </small>
                </td>

                <td>
                  {lead.email}
                  <small>{lead.phone}</small>
                </td>

                <td>
                  {lead.address ||
                    "Not provided"}
                  <small>{lead.eircode}</small>
                </td>

                <td>
                  {lead.provider}

                  <small>
                    MPRN: {lead.mprn}
                  </small>

                  <small>
                    Meter:{" "}
                    {lead.meterNumber || "—"}
                  </small>
                </td>

                <td>
                  <Status status={lead.status} />
                </td>

                <td>
                  <button
                    className="convert-button"
                    disabled={
                      busyId === lead.id
                    }
                    onClick={() =>
                      convertCustomer(lead)
                    }
                  >
                    {busyId === lead.id
                      ? "Converting..."
                      : "Convert to Customer"}
                  </button>
                </td>
              </tr>
            ))}

            {!leads.length && (
              <tr>
                <td
                  colSpan="6"
                  className="empty"
                >
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Customers() {
  const [customers, setCustomers] =
    useState([]);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [issuedPassword, setIssuedPassword] = useState(null);

  async function loadCustomers() {
    const result = await api(
      `/customers?status=CUSTOMER&search=${encodeURIComponent(
        search
      )}`
    );
    setCustomers(result.data);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers().catch((err) =>
        setError(err.message)
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function resendLogin(customer) {
    try {
      setBusyId(customer.id);
      setError("");
      setMessage("");
      setIssuedPassword(null);

      const result = await api(
        `/customers/${customer.id}/resend-login`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (result.temporaryPassword) {
        setIssuedPassword({
          email: customer.email,
          password: result.temporaryPassword,
          provider: result.emailProvider,
        });
      }

      setMessage(
        result.emailProvider === "gmail"
          ? `Login email was sent through Gmail to ${customer.email}.`
          : `Login email was accepted for ${customer.email}. Copy the temporary password below if it does not arrive.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page">
      <PageHeading
        title="Active Customers"
        description="Customers who have received login credentials."
      />

      <input
        className="search-input"
        placeholder="Search customers"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
      />

      {issuedPassword && (
        <IssuedCredentials
          email={issuedPassword.email}
          password={issuedPassword.password}
        />
      )}

      {message && (
        <Message type="success">
          {message}
        </Message>
      )}

      {error && (
        <Message type="error">
          {error}
        </Message>
      )}

      <div className="customer-grid">
        {customers.map((customer) => (
          <article
            className="customer-card"
            key={customer.id}
          >
            <div className="card-top">
              <div className="customer-avatar large">
                {customer.firstName?.[0]}
                {customer.lastName?.[0]}
              </div>

              <Status
                status={customer.status}
              />
            </div>

            <h3>
              {customer.firstName}{" "}
              {customer.lastName}
            </h3>

            <p>{customer.email}</p>

            <div className="detail-row">
              <span>Phone</span>
              <strong>{customer.phone}</strong>
            </div>

            <div className="detail-row">
              <span>Eircode</span>
              <strong>{customer.eircode}</strong>
            </div>

            <div className="detail-row">
              <span>Provider</span>
              <strong>{customer.provider}</strong>
            </div>

            <div className="detail-row">
              <span>MPRN</span>
              <strong>{customer.mprn}</strong>
            </div>

            <small>
              Converted:{" "}
              {customer.convertedAt
                ? new Date(
                  customer.convertedAt
                ).toLocaleString()
                : "Not available"}
            </small>

            <button
              className="convert-button"
              disabled={busyId === customer.id}
              onClick={() => resendLogin(customer)}
            >
              {busyId === customer.id
                ? "Sending..."
                : "Resend login email"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [openChatId, setOpenChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  async function loadTickets() {
    try {
      const [result, unread] = await Promise.all([
        api("/tickets"),
        api("/tickets/unread"),
      ]);
      setTickets(result.data);
      setUnreadTotal(unread.total || 0);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTickets();
    const id = window.setInterval(loadTickets, 20000);
    return () => window.clearInterval(id);
  }, []);

  async function changeTicketStatus(ticketId, status) {
    try {
      await api(`/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadTickets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openChat(ticketId) {
    setOpenChatId(ticketId);
    setChatDraft("");
    try {
      const result = await api(`/tickets/${ticketId}/messages`);
      setChatMessages(result.messages || []);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendChatMessage() {
    const text = chatDraft.trim();
    if (!text || !openChatId || chatBusy) return;
    setChatBusy(true);
    try {
      await api(`/tickets/${openChatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text, senderName: "CRM Agent" }),
      });
      setChatDraft("");
      const result = await api(`/tickets/${openChatId}/messages`);
      setChatMessages(result.messages || []);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <section className="page">
      <PageHeading
        title="Support Tickets"
        description="Track, chat with customers, and resolve support requests."
      />

      {error && (
        <Message type="error">{error}</Message>
      )}

      {unreadTotal > 0 && (
        <div className="crm-unread-banner">
          <strong>{unreadTotal} unread customer message{unreadTotal === 1 ? "" : "s"}</strong>
        </div>
      )}

      <div className="ticket-grid">
        {tickets.map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div className="card-top">
              <div>
                <small>Ticket #{ticket.id}</small>
                <h3>{ticket.subject}</h3>
              </div>
              <div className="ticket-card-badges">
                {ticket.unread_count > 0 && (
                  <span className="nav-badge">{ticket.unread_count}</span>
                )}
                <Status status={ticket.status} />
              </div>
            </div>

            <p>{ticket.description}</p>

            <div className="ticket-details">
              <span>
                {ticket.customer
                  ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
                  : "Unknown customer"}
              </span>
              <span>Priority: {ticket.priority}</span>
            </div>

            <div className="ticket-card-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => openChat(ticket.id)}
              >
                Chat
              </button>

              <select
                value={ticket.status}
                onChange={(event) =>
                  changeTicketStatus(ticket.id, event.target.value)
                }
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {openChatId === ticket.id && (
              <div className="ticket-chat-box">
                <div className="ticket-chat-messages">
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.sender_role === "staff"
                          ? "crm-chat-bubble staff"
                          : "crm-chat-bubble customer"
                      }
                    >
                      <small>
                        {m.sender_name || m.sender_role} ·{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </small>
                      <p>{m.body}</p>
                    </div>
                  ))}
                  {!chatMessages.length && (
                    <p className="muted">No messages yet.</p>
                  )}
                </div>
                <div className="ticket-chat-compose">
                  <textarea
                    rows={2}
                    placeholder="Reply to customer…"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="primary-button"
                    disabled={chatBusy || !chatDraft.trim()}
                    onClick={sendChatMessage}
                  >
                    {chatBusy ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}

        {!tickets.length && <p>No support tickets found.</p>}
      </div>
    </section>
  );
}

function PageHeading({
  title,
  description,
}) {
  return (
    <div className="page-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function IssuedCredentials({ email, password }) {
  return (
    <div className="password-box">
      <strong>Temporary password</strong>
      <p>
        Give this password to {email}. Copy it now — this is the login
        even if the email never arrives.
      </p>
      <code>{password}</code>
    </div>
  );
}

function MetricCard({
  label,
  value,
  text,
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </article>
  );
}

function Status({ status }) {
  return (
    <span
      className={`status ${String(
        status
      ).toLowerCase()}`}
    >
      {status}
    </span>
  );
}

function Message({
  type = "normal",
  children,
}) {
  return (
    <div className={`message ${type}`}>
      {children}
    </div>
  );
}

export default App;