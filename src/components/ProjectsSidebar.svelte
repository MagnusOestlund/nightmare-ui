<script lang="ts">
  /**
   * Projects Sidebar Component
   * 
   * Left sidebar for Projects tab - shows project list
   * Positioned same as Node Palette in Canvas tab
   */

  import { onMount } from 'svelte';
  import ProjectTemplatesModal from './ProjectTemplatesModal.svelte';

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let projects = $state<any[]>([]);
  let selectedProjectId = $state<string | null>(null);
  let loading = $state<boolean>(false);
  let error = $state<string | null>(null);
  let showTemplatesModal = $state<boolean>(false);
  let searchQuery = $state<string>('');

  let { 
    onProjectSelect = null,
    selectedProjectId: propSelectedProjectId = null
  }: {
    onProjectSelect?: ((projectId: string) => void) | null;
    selectedProjectId?: string | null;
  } = $props();

  $effect(() => {
    if (propSelectedProjectId !== null) {
      selectedProjectId = propSelectedProjectId;
    }
  });

  // Mock data for development
  const mockProjects = [
    {
      id: '1',
      name: 'Invoice Automator',
      description: 'Automatically extract VAT and totals from Swedish invoices',
      goal: 'Streamline invoice processing workflow',
      team: 'Engineering',
      created_at: '2024-01-15',
      updated_at: '2024-01-20',
    },
  ];

  onMount(() => {
    loadProjects();
  });

  async function loadProjects() {
    loading = true;
    error = null;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/projects`);
      if (res.ok) {
        const data = await res.json();
        projects = data.projects || [];
        if (projects.length > 0 && !selectedProjectId) {
          selectedProjectId = projects[0].id;
          if (onProjectSelect) {
            onProjectSelect(projects[0].id);
          }
        }
      } else {
        throw new Error(`Failed to load projects: ${res.statusText}`);
      }
    } catch (err: any) {
      console.warn('Error loading projects, using mock data:', err.message);
      projects = mockProjects;
      if (projects.length > 0 && !selectedProjectId) {
        selectedProjectId = projects[0].id;
        if (onProjectSelect) {
          onProjectSelect(projects[0].id);
        }
      }
    } finally {
      loading = false;
    }
  }

  function handleProjectClick(projectId: string) {
    selectedProjectId = projectId;
    if (onProjectSelect) {
      onProjectSelect(projectId);
    }
  }

  function handleTemplateSelect(templateId: string) {
    // After template is selected, reload projects and select the new one
    loadProjects();
    // The new project should be selected automatically by loadProjects
  }

  // Filter projects based on search query
  let filteredProjects = $derived.by(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    const query = searchQuery.toLowerCase();
    return projects.filter(project => {
      const nameMatch = project.name?.toLowerCase().includes(query);
      const teamMatch = project.team?.toLowerCase().includes(query);
      const descriptionMatch = project.description?.toLowerCase().includes(query);
      return nameMatch || teamMatch || descriptionMatch;
    });
  });
</script>

<div style="width: 250px; height: 100vh; border-right: 1px solid #333; background: #1a1a1f; overflow-y: auto; padding: 10px; display: flex; flex-direction: column;">
  <h2 style="color: white; margin-bottom: 15px; flex-shrink: 0;">Projects</h2>
  
  <!-- Search Bar -->
  <div style="margin-bottom: 15px; flex-shrink: 0;">
    <input
      type="text"
      placeholder="Search projects..."
      bind:value={searchQuery}
      style="
        width: 100%;
        padding: 8px 12px;
        background: #25252a;
        border: 1px solid #333;
        border-radius: 4px;
        color: white;
        font-size: 14px;
      "
      onfocus={(e) => {
        e.currentTarget.style.borderColor = '#007bff';
      }}
      onblur={(e) => {
        e.currentTarget.style.borderColor = '#333';
      }}
    />
  </div>
  
  <!-- New Project Button -->
  <button
    onclick={() => showTemplatesModal = true}
    style="
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      background: #007bff;
      border: 1px solid #007bff;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    "
    onmouseenter={(e) => {
      e.currentTarget.style.background = '#0056b3';
      e.currentTarget.style.borderColor = '#0056b3';
    }}
    onmouseleave={(e) => {
      e.currentTarget.style.background = '#007bff';
      e.currentTarget.style.borderColor = '#007bff';
    }}
  >
    + New Project
  </button>
  
  {#if loading}
    <div style="color: #888; font-size: 14px;">Loading projects...</div>
  {:else if error}
    <div style="color: #dc3545; font-size: 14px;">Error: {error}</div>
  {:else if filteredProjects.length === 0}
    <div style="color: #888; font-size: 14px;">
      {searchQuery.trim() ? 'No projects match your search' : 'No projects yet'}
    </div>
  {:else}
    <div style="flex: 1; overflow-y: auto;">
      {#each filteredProjects as project}
        <div
          onclick={() => handleProjectClick(project.id)}
          style="
            padding: 12px;
            margin-bottom: 8px;
            background: {selectedProjectId === project.id ? '#007bff' : '#25252a'};
            border: 1px solid {selectedProjectId === project.id ? '#007bff' : '#333'};
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          "
          onmouseenter={(e) => {
            if (selectedProjectId !== project.id) {
              e.currentTarget.style.background = '#2a2a2f';
              e.currentTarget.style.borderColor = '#444';
            }
          }}
          onmouseleave={(e) => {
            if (selectedProjectId !== project.id) {
              e.currentTarget.style.background = '#25252a';
              e.currentTarget.style.borderColor = '#333';
            }
          }}
        >
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: white;">
            {project.name}
          </div>
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
            {project.team}
          </div>
          <div style="font-size: 11px; color: #666;">
            Updated: {project.updated_at}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Templates Modal -->
<ProjectTemplatesModal
  show={showTemplatesModal}
  onClose={() => showTemplatesModal = false}
  onSelectTemplate={handleTemplateSelect}
/>

