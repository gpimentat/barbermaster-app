import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, X, ChevronDown, Phone, FileText, Star, Check, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

// Dynamically import Leaflet to avoid SSR issues
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const barbershopIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;background:linear-gradient(135deg,#D4AF37,#b8932c);
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);font-size:16px;">✂️</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const leadIcon = (status: string) => {
  const colors: Record<string, string> = {
    not_contacted: '#6b7280',
    contacted: '#3b82f6',
    interested: '#10b981',
    not_interested: '#ef4444',
    client: '#D4AF37',
  };
  const color = colors[status] || '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;background:${color};
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:16px;">✂️</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Status config
const STATUS_CONFIG = {
  not_contacted: { label: 'Não contatado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', dot: 'bg-gray-500' },
  contacted:     { label: 'Contatado',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',  dot: 'bg-blue-500' },
  interested:    { label: 'Interessado',   color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-500' },
  not_interested:{ label: 'Sem interesse', color: 'bg-red-500/20 text-red-400 border-red-500/30',     dot: 'bg-red-500' },
  client:        { label: '⭐ Cliente',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
} as const;

type LeadStatus = keyof typeof STATUS_CONFIG;

interface Lead {
  id: string;
  osm_id?: string;
  place_name: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  status: LeadStatus;
  notes?: string;
  contacted_at?: string;
  created_at: string;
  salesperson_id?: string;
  salesperson?: { name: string };
}

interface OSMPlace {
  id: string;
  name: string;
  tags: Record<string, string>;
  lat: number;
  lon: number;
}

// Component to fly map to searched location
const FlyTo: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom]);
  return null;
};

// ─────────────────────────────────────────────
const SalesMapPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Brasil center
  const [mapZoom, setMapZoom] = useState(5);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [osmPlaces, setOsmPlaces] = useState<OSMPlace[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'leads' | 'found'>('found');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingLead, setSavingLead] = useState<string | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    const { data } = await supabase
      .from('saas_leads')
      .select('*, salesperson:profiles(name)')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoadingLeads(false);
  };

  const searchRegion = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setOsmPlaces([]);
    try {
      // 1. Geocode the searched location with Nominatim
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) { alert('Local não encontrado. Tente ser mais específico.'); return; }

      const { lat, lon, boundingbox } = geoData[0];
      const centerLat = parseFloat(lat);
      const centerLon = parseFloat(lon);

      setFlyTarget({ center: [centerLat, centerLon], zoom: 14 });

      // 2. Build Overpass bbox (expand a bit if tiny)
      const south = parseFloat(boundingbox[0]);
      const north = parseFloat(boundingbox[1]);
      const west  = parseFloat(boundingbox[2]);
      const east  = parseFloat(boundingbox[3]);

      const expandedSouth = Math.min(south, centerLat - 0.02);
      const expandedNorth = Math.max(north, centerLat + 0.02);
      const expandedWest  = Math.min(west,  centerLon - 0.02);
      const expandedEast  = Math.max(east,  centerLon + 0.02);

      const bbox = `${expandedSouth},${expandedWest},${expandedNorth},${expandedEast}`;

      // 3. Query Overpass for barbershops & hairdressers
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"="hairdresser"](${bbox});
          node["shop"="barber"](${bbox});
          node["amenity"="hairdresser"](${bbox});
          way["shop"="hairdresser"](${bbox});
          way["shop"="barber"](${bbox});
        );
        out center;
      `;

      const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const overpassData = await overpassRes.json();

      const places: OSMPlace[] = (overpassData.elements || [])
        .filter((el: any) => el.tags?.name)
        .map((el: any) => ({
          id: `${el.type}/${el.id}`,
          name: el.tags.name,
          tags: el.tags,
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
        }))
        .filter((p: OSMPlace) => p.lat && p.lon);

      setOsmPlaces(places);
      setSidebarTab('found');
    } catch (err) {
      console.error('Search error:', err);
      alert('Erro ao buscar. Verifique sua conexão e tente novamente.');
    } finally {
      setSearching(false);
    }
  };

  const saveLead = async (place: OSMPlace) => {
    if (!currentUser?.id) return;
    setSavingLead(place.id);
    const address = [
      place.tags['addr:street'],
      place.tags['addr:housenumber'],
      place.tags['addr:suburb'] || place.tags['addr:city'],
    ].filter(Boolean).join(', ');
  
    const { data, error } = await supabase.from('saas_leads').insert({
      salesperson_id: currentUser.id,
      osm_id: place.id,
      place_name: place.name,
      address: address || null,
      lat: place.lat,
      lng: place.lon,
      phone: place.tags.phone || place.tags['contact:phone'] || null,
      status: 'not_contacted',
    }).select('*, salesperson:profiles(name)').single();
  
    if (error) {
      if (error.code === '23505') {
        alert('Este lead já foi capturado por outro vendedor!');
        fetchLeads(); // Refresh to show the owner
      } else {
        alert('Erro ao salvar lead.');
      }
    } else if (data) {
      setLeads(prev => [data, ...prev]);
      setSidebarTab('leads');
    }
    setSavingLead(null);
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    await supabase.from('saas_leads').update({
      status,
      contacted_at: status !== 'not_contacted' ? new Date().toISOString() : null,
    }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const saveNote = async (id: string) => {
    await supabase.from('saas_leads').update({ notes: noteText }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: noteText } : l));
    setEditingNote(null);
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Remover este lead da sua lista?')) return;
    await supabase.from('saas_leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const isAlreadyLead = (osmId: string) => leads.some(l => l.osm_id === osmId);

  const filteredLeads = filterStatus === 'all' ? leads : leads.filter(l => l.status === filterStatus);

  const leadCountByStatus = (status: LeadStatus) => leads.filter(l => l.status === status).length;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mapa de Prospecção 🗺️</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Encontre e acompanhe barbearias da região</p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchRegion()}
              placeholder="Digite cidade, bairro ou endereço..."
              className="w-full bg-dark-900 border border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 font-medium"
            />
          </div>
          <button
            onClick={searchRegion}
            disabled={searching}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20 disabled:opacity-60"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', background: '#0f0f0f' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

            {/* OSM found places */}
            {osmPlaces.map(place => {
              const savedLead = leads.find(l => l.osm_id === place.id);
              const alreadySaved = !!savedLead;
              const isMine = savedLead?.salesperson_id === currentUser?.id;
              
              // Custom icon for leads belonging to others
              const markerIcon = isMine 
                ? leadIcon(savedLead.status) 
                : (alreadySaved 
                    ? L.divIcon({
                        className: '',
                        html: `<div style="width:36px;height:36px;background:#4b5563;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #374151;box-shadow:0 2px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">👤</span></div>`,
                        iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
                      })
                    : barbershopIcon);

              return (
                <Marker
                  key={place.id}
                  position={[place.lat, place.lon]}
                  icon={markerIcon}
                >
                  <Popup>
                    <div style={{ minWidth: 200, fontFamily: 'sans-serif' }}>
                      <p style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>{place.name}</p>
                      {place.tags['addr:street'] && (
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                          {place.tags['addr:street']} {place.tags['addr:housenumber'] || ''}
                        </p>
                      )}
                      {(place.tags.phone || place.tags['contact:phone']) && (
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                          📞 {place.tags.phone || place.tags['contact:phone']}
                        </p>
                      )}
                      {alreadySaved ? (
                        <div style={{ background: isMine ? '#16a34a20' : '#374151', border: isMine ? '1px solid #16a34a40' : '1px solid #4b5563', borderRadius: 8, padding: '6px 12px', textAlign: 'center', fontSize: 12, color: isMine ? '#4ade80' : '#9ca3af', fontWeight: 700 }}>
                          {isMine ? '✅ Na sua lista' : `🔒 Lead de ${savedLead?.salesperson?.name || 'outro vendedor'}`}
                        </div>
                      ) : (
                        <button
                          onClick={() => saveLead(place)}
                          disabled={savingLead === place.id}
                          style={{
                            background: '#D4AF37', color: '#000', border: 'none',
                            borderRadius: 8, padding: '8px 16px', fontWeight: 900,
                            cursor: 'pointer', width: '100%', fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {savingLead === place.id ? '...' : '+ Salvar Lead'}
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Leads that have coordinates but weren't in current search */}
            {leads
              .filter(l => l.lat && l.lng && !osmPlaces.some(p => p.id === l.osm_id))
              .map(lead => (
                <Marker
                  key={lead.id}
                  position={[lead.lat!, lead.lng!]}
                  icon={leadIcon(lead.status)}
                >
                  <Popup>
                    <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                      <p style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>{lead.place_name}</p>
                      <p style={{ fontSize: 12, color: STATUS_CONFIG[lead.status].dot.replace('bg-', '#').replace('-500', '') }}>
                        {STATUS_CONFIG[lead.status].label}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))
            }
          </MapContainer>

          {/* Results badge */}
          {osmPlaces.length > 0 && (
            <div className="absolute top-4 left-4 bg-dark-900/95 border border-primary-500/40 backdrop-blur-md rounded-2xl px-4 py-2 z-[1000] shadow-xl">
              <span className="text-primary-500 font-black text-sm">✂️ {osmPlaces.length} barbearias encontradas</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-3 min-h-0">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            {(['contacted', 'interested', 'client'] as LeadStatus[]).map(s => (
              <div key={s} className={`bg-dark-900 border rounded-2xl p-3 text-center ${STATUS_CONFIG[s].color.replace('text-', 'border-').split(' ')[2]}`}>
                <p className="text-lg font-black text-white">{leadCountByStatus(s)}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${STATUS_CONFIG[s].color.split(' ')[1]}`}>
                  {STATUS_CONFIG[s].label.replace('⭐ ', '')}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-900/60 p-1 rounded-xl border border-gray-800/50">
            <button
              onClick={() => setSidebarTab('found')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${sidebarTab === 'found' ? 'bg-primary-500 text-dark-950' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Encontrados {osmPlaces.length > 0 && `(${osmPlaces.length})`}
            </button>
            <button
              onClick={() => setSidebarTab('leads')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${sidebarTab === 'leads' ? 'bg-primary-500 text-dark-950' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Meus Leads {leads.length > 0 && `(${leads.length})`}
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {sidebarTab === 'found' && (
              <>
                {osmPlaces.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12">
                    <span className="text-5xl">🔍</span>
                    <p className="text-gray-400 font-black text-sm uppercase tracking-tight">Busque uma região</p>
                    <p className="text-gray-600 text-xs">Ex: "Vila Madalena, SP" ou "Florianópolis"</p>
                  </div>
                ) : (
                  osmPlaces.map(place => {
                    const savedLead = leads.find(l => l.osm_id === place.id);
                    const alreadySaved = !!savedLead;
                    const isMine = savedLead?.salesperson_id === currentUser?.id;
                    const phone = place.tags.phone || place.tags['contact:phone'];
                    const address = [place.tags['addr:street'], place.tags['addr:housenumber']].filter(Boolean).join(' ');
                    return (
                      <div key={place.id} className={`bg-dark-900 border rounded-2xl p-4 transition-all ${alreadySaved ? (isMine ? 'border-green-500/30' : 'border-gray-700 opacity-60') : 'border-gray-800/50 hover:border-gray-700'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="font-black text-white text-sm leading-tight">{place.name}</p>
                          {alreadySaved && (isMine ? <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" /> : <X size={14} className="text-gray-600 flex-shrink-0 mt-0.5" />)}
                        </div>
                        {address && <p className="text-xs text-gray-500 mb-1">📍 {address}</p>}
                        {phone && <p className="text-xs text-gray-500 mb-3">📞 {phone}</p>}
                        {alreadySaved ? (
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isMine ? 'text-green-500' : 'text-gray-500'}`}>
                            {isMine ? 'Seu Lead' : `Lead de ${savedLead?.salesperson?.name || 'Outro'}`}
                          </p>
                        ) : (
                          <button
                            onClick={() => saveLead(place)}
                            disabled={savingLead === place.id}
                            className="w-full py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-primary-500/20"
                          >
                            {savingLead === place.id ? 'Salvando...' : '+ Salvar Lead'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {sidebarTab === 'leads' && (
              <>
                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as LeadStatus | 'all')}
                  className="w-full bg-dark-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-primary-500"
                >
                  <option value="all">Todos os status</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>

                {loadingLeads ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-primary-500" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 text-center py-12">
                    <span className="text-5xl">📋</span>
                    <p className="text-gray-400 font-black text-sm uppercase tracking-tight">Nenhum lead ainda</p>
                    <p className="text-gray-600 text-xs">Busque uma região e salve barbearias</p>
                  </div>
                ) : (
                  filteredLeads
                    .filter(l => l.salesperson_id === currentUser?.id)
                    .map(lead => {
                    const statusConf = STATUS_CONFIG[lead.status];
                    return (
                      <div key={lead.id} className="bg-dark-900 border border-gray-800/50 rounded-2xl p-4 hover:border-gray-700 transition-all">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <p className="font-black text-white text-sm leading-tight">{lead.place_name}</p>
                          <button onClick={() => deleteLead(lead.id)} className="text-gray-700 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {lead.address && <p className="text-xs text-gray-600 mb-1">📍 {lead.address}</p>}
                        {lead.phone && <p className="text-xs text-gray-600 mb-3">📞 {lead.phone}</p>}

                        {/* Status dropdown */}
                        <select
                          value={lead.status}
                          onChange={e => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className={`w-full rounded-xl px-3 py-1.5 text-xs font-black border focus:outline-none mb-2 ${statusConf.color}`}
                          style={{ background: 'transparent' }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: '#1a1a1a', color: '#fff' }}>{v.label}</option>
                          ))}
                        </select>

                        {/* Note */}
                        {editingNote === lead.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              placeholder="Anotação rápida..."
                              rows={3}
                              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 resize-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => saveNote(lead.id)} className="flex-1 py-1.5 bg-primary-500 text-dark-950 rounded-lg text-xs font-black">Salvar</button>
                              <button onClick={() => setEditingNote(null)} className="flex-1 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNote(lead.id); setNoteText(lead.notes || ''); }}
                            className="w-full text-left text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-2"
                          >
                            <FileText size={11} />
                            {lead.notes ? <span className="truncate italic">{lead.notes}</span> : <span>Adicionar nota...</span>}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesMapPage;
