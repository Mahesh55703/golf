"use client";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, MapPin, CalendarDays, X, ChevronDown } from "lucide-react";
import { tournaments } from "@/lib/data";
import { TournamentCard } from "@/components/tournament-card";

export function TournamentBrowser() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All locations");
  const [format, setFormat] = useState("All formats");
  const [access, setAccess] = useState("All events");
  const [sort, setSort] = useState("soonest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = tournaments.filter((t) => {
      const matchesSearch = !q || [t.name, t.club, t.location, t.format].some((v) => v.toLowerCase().includes(q));
      const matchesRegion = region === "All locations" || t.region === region;
      const matchesFormat = format === "All formats" || t.format === format;
      const matchesAccess = access === "All events" || t.access === access;
      return matchesSearch && matchesRegion && matchesFormat && matchesAccess;
    });
    return filtered.sort((a, b) => sort === "fee-low" ? a.entryFee - b.entryFee : sort === "fee-high" ? b.entryFee - a.entryFee : a.startDate.localeCompare(b.startDate));
  }, [search, region, format, access, sort]);
  const reset = () => { setSearch(""); setRegion("All locations"); setFormat("All formats"); setAccess("All events"); setSort("soonest"); };
  const hasFilters = search || region !== "All locations" || format !== "All formats" || access !== "All events";

  return <div className="browser-layout">
    <aside className={`filter-panel ${filtersOpen ? "filter-panel-open" : ""}`}>
      <div className="filter-title-row"><div><SlidersHorizontal size={17} /><strong>Filters</strong></div><button className="filter-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button></div>
      <div className="filter-group"><label htmlFor="location-filter"><MapPin size={15} /> Location</label><select id="location-filter" value={region} onChange={(e) => setRegion(e.target.value)}><option>All locations</option><option>India</option><option>International</option></select></div>
      <div className="filter-group"><label htmlFor="format-filter">Tournament format</label><select id="format-filter" value={format} onChange={(e) => setFormat(e.target.value)}><option>All formats</option><option>Stroke Play</option><option>Stableford</option><option>Match Play</option><option>Scramble</option></select></div>
      <div className="filter-group"><label htmlFor="access-filter">Who can play?</label><select id="access-filter" value={access} onChange={(e) => setAccess(e.target.value)}><option>All events</option><option>Public</option><option>Members only</option></select></div>
      <div className="filter-divider" />
      <div className="filter-note"><CalendarDays size={17} /><div><strong>Plan your next round</strong><p>Find an event that fits your schedule and your game.</p></div></div>
      {hasFilters && <button className="clear-filters" onClick={reset}>Clear all filters <X size={13} /></button>}
    </aside>
    <div className="results-area">
      <div className="results-toolbar"><div className="search-box"><Search size={18} /><input aria-label="Search tournaments" placeholder="Search by event, club or location..." value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}</div><button className="mobile-filter-button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters</button><label className="sort-control"><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tournaments"><option value="soonest">Soonest</option><option value="fee-low">Entry fee: low to high</option><option value="fee-high">Entry fee: high to low</option></select><ChevronDown size={14} /></label></div>
      <div className="results-count"><span><strong>{results.length}</strong> events to explore</span><span className="results-count-note">New events added regularly</span></div>
      {results.length > 0 ? <div className="tournament-grid">{results.map((t) => <TournamentCard key={t.id} tournament={t} />)}</div> : <div className="empty-results"><div className="empty-icon"><Search size={24} /></div><h3>No tournaments found</h3><p>Try changing your search or removing a filter to see more events.</p><button className="button button-dark" onClick={reset}>Reset filters</button></div>}
    </div>
    {filtersOpen && <button className="filter-backdrop" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
  </div>;
}
