(() => {
  const $ = (sel, root=document)=> root.querySelector(sel);
  const qs = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
  const STORAGE_KEY = 'fdp_assignments_v1';

  const assignmentsList = $('#assignmentsList');
  const addBtn = $('#addBtn');
  const modal = $('#modal');
  const cancelBtn = $('#cancelBtn');
  const form = $('#assignmentForm');
  const search = $('#search');
  const filterModule = $('#filterModule');
  const statTotal = $('#statTotal');
  const statDone = $('#statDone');
  const statPending = $('#statPending');
  const exportBtn = $('#exportBtn');
  const importFile = $('#importFile');

  let assignments = [];

  const seed = ()=> ([
    {id: id(), title:'Intro to FDP - Reflection', description:'Write 500 words on FDP learnings', module:'Module 1', dueDate: nextDate(3), status:'Pending', link:''},
    {id: id(), title:'Create HTML Skeleton', description:'Build an index page and link styles/scripts', module:'Module 2', dueDate: nextDate(7), status:'In Progress', link:''},
    {id: id(), title:'Database Design Task', description:'Normalize STUDENT table up to 3NF', module:'Module 3', dueDate: nextDate(10), status:'Pending', link:''}
  ]);

  function id(){ return 'a'+Math.random().toString(36).slice(2,9); }
  function nextDate(days){ const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      assignments = JSON.parse(raw);

      // ✅ Ensure Day 4 assignments exist
      const required = [
        {
          title:'Day 4 - Assignment 1: Literature Mapping',
          description:'PDF file for Literature Mapping exercise.',
          module:'Module 4',
          dueDate: nextDate(2),
          status:'Pending',
          link:'Day%204%20assignment%201%20Literature%20Mapping.pdf'
        },
        {
          title:'Day 4 - Assignment 2: Webpage',
          description:'PDF file showing webpage assignment.',
          module:'Module 4',
          dueDate: nextDate(2),
          status:'Pending',
          link:'Day4%20assignment%202%20webpage.pdf'
        }
      ];

      required.forEach(r=>{
        if(!assignments.some(a=>a.title===r.title)) {
          assignments.push({...r, id:id()});
        }
      });
      save();

    } else {
      assignments = seed();
      save();
    }
    render();
  }

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); }

  function render(){
    const modules = Array.from(new Set(assignments.map(a=>a.module))).sort();
    filterModule.innerHTML = '<option value="all">All modules</option>' + modules.map(m=>`<option value="${m}">${m}</option>`).join('');

    const q = search.value.trim().toLowerCase();
    const mod = filterModule.value || 'all';
    const filtered = assignments.filter(a=>{
      if(mod!=='all' && a.module !== mod) return false;
      if(!q) return true;
      return (a.title+' '+a.description+' '+a.module).toLowerCase().includes(q);
    }).sort((x,y)=> new Date(x.dueDate)-new Date(y.dueDate));

    assignmentsList.innerHTML = filtered.map(a=>cardHtml(a)).join('') || '<p class="small">No assignments found. Add a new assignment using the + Add Assignment button.</p>';

    qs('.card').forEach(el=>{
      const id = el.dataset.id;
      el.querySelector('.edit')?.addEventListener('click', ()=> openEdit(id));
      el.querySelector('.delete')?.addEventListener('click', ()=> removeAssignment(id));
      el.querySelector('.toggle')?.addEventListener('click', ()=> toggleStatus(id));
    });

    statTotal.textContent = assignments.length;
    statDone.textContent = assignments.filter(a=>a.status==='Completed').length;
    statPending.textContent = assignments.filter(a=>a.status!=='Completed').length;
  }

  function cardHtml(a){
    return `
      <article class="card" data-id="${a.id}">
        <h4>${escapeHtml(a.title)}</h4>
        <p class="small">${escapeHtml(a.description || '')}</p>
        <div class="meta">
          <div class="badge">${a.module}</div>
          <div class="small">Due: ${a.dueDate}</div>
          <div class="small">Status: ${a.status}</div>
        </div>
        <div style="margin-top:.5rem;display:flex;gap:.4rem">
          ${a.link?`<a class="small" href="${a.link}" target="_blank">📄 Open PDF</a>`:''}
          <button class="small toggle">Mark ${a.status==='Completed'?'Pending':'Completed'}</button>
          <button class="small edit">Edit</button>
          <button class="small delete">Delete</button>
        </div>
      </article>
    `;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function openAdd(){ form.reset(); form.id.value=''; $('#modalTitle').textContent='Add Assignment'; openModal(); }
  function openEdit(id){ const a = assignments.find(x=>x.id===id); if(!a) return;
    form.title.value=a.title; form.description.value=a.description; form.module.value=a.module;
    form.dueDate.value=a.dueDate; form.status.value=a.status; form.link.value=a.link||'';
    form.id.value=a.id; $('#modalTitle').textContent='Edit Assignment'; openModal(); }
  function removeAssignment(id){ if(!confirm('Delete this assignment?')) return;
    assignments = assignments.filter(a=>a.id!==id); save(); render(); }
  function toggleStatus(id){ const a = assignments.find(x=>x.id===id); if(!a) return;
    a.status = a.status==='Completed' ? 'Pending' : 'Completed'; save(); render(); }

  function openModal(){ modal.classList.remove('hidden'); }
  function closeModal(){ modal.classList.add('hidden'); }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if(!data.title || !data.dueDate) return alert('Please add title and due date');
    if(data.id){
      const idx = assignments.findIndex(a=>a.id===data.id);
      if(idx>-1){ assignments[idx] = {...assignments[idx], ...data}; }
    } else {
      assignments.push({id:id(), title:data.title, description:data.description, module:data.module, dueDate:data.dueDate, status:data.status || 'Pending', link:data.link});
    }
    save(); render(); closeModal();
  });

  cancelBtn.addEventListener('click', ()=> closeModal());
  addBtn.addEventListener('click', ()=> openAdd());
  search.addEventListener('input', ()=> render());
  filterModule.addEventListener('change', ()=> render());

  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(assignments,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='fdp_assignments.json'; a.click();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{ const data = JSON.parse(reader.result);
        if(Array.isArray(data)){ assignments = data; save(); render(); alert('Imported successfully'); }
        else alert('Invalid file');
      } catch(err){ alert('Error parsing file'); }
    };
    reader.readAsText(f);
  });

  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

  load();
})();
