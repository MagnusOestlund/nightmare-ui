<script lang="ts">
  /**
   * Project Templates Modal
   * 
   * Shows pre-built workflow templates that users can one-click install
   */

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let {
    show = false,
    onClose = null,
    onSelectTemplate = null
  }: {
    show?: boolean;
    onClose?: (() => void) | null;
    onSelectTemplate?: ((templateId: string) => void) | null;
  } = $props();

  // Empty project option (first in list)
  const emptyProject = {
    id: 'empty-project',
    name: 'Empty Project',
    description: 'Start with a blank canvas and build your workflow from scratch',
    category: 'Blank',
    icon: '📄',
    features: ['Blank Canvas', 'Full Control'],
    estimatedTime: '0 min setup'
  };

  // Mock templates for now (will be loaded from API later)
  const templates = [
    {
      id: 'customer-support-bot',
      name: 'Customer Support Bot',
      description: 'Automated customer support workflow with AI responses, ticket routing, and escalation',
      category: 'Support',
      icon: '💬',
      features: ['AI Chat', 'Ticket Routing', 'Escalation', 'Knowledge Base'],
      estimatedTime: '5 min setup'
    },
    {
      id: 'weekly-report-generator',
      name: 'Weekly Report Generator',
      description: 'Automatically generate weekly reports from data sources, format, and email to stakeholders',
      category: 'Reporting',
      icon: '📊',
      features: ['Data Aggregation', 'Report Formatting', 'Email Delivery', 'Scheduling'],
      estimatedTime: '3 min setup'
    },
    {
      id: 'invoice-checker',
      name: 'Invoice Checker',
      description: 'Extract VAT, totals, and details from invoices, validate against rules, and route for approval',
      category: 'Finance',
      icon: '🧾',
      features: ['OCR', 'VAT Extraction', 'Validation', 'Approval Workflow'],
      estimatedTime: '7 min setup'
    },
    {
      id: 'email-broker',
      name: 'Email Broker',
      description: 'Process incoming emails, classify, route to appropriate handlers, and generate responses',
      category: 'Communication',
      icon: '📧',
      features: ['Email Processing', 'Classification', 'Routing', 'Auto-Response'],
      estimatedTime: '4 min setup'
    },
    {
      id: 'data-pipeline',
      name: 'Data Pipeline',
      description: 'ETL pipeline: Extract from sources, transform data, load to destination with validation',
      category: 'Data',
      icon: '🔄',
      features: ['Data Extraction', 'Transformation', 'Validation', 'Loading'],
      estimatedTime: '6 min setup'
    }
  ];

  let loading = $state<Record<string, boolean>>({});

  async function handleTemplateSelect(templateId: string) {
    loading[templateId] = true;
    loading = { ...loading };

    try {
      if (templateId === 'empty-project') {
        // Create empty project
        const res = await fetch(`${API_BASE}/api/v1/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'New Project',
            description: 'Empty project',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (onSelectTemplate) {
            onSelectTemplate(data.project_id || data.id);
          }
          if (onClose) {
            onClose();
          }
        } else {
          // For now, just call the callback (mock behavior)
          if (onSelectTemplate) {
            onSelectTemplate(templateId);
          }
          if (onClose) {
            onClose();
          }
        }
      } else {
        // Call API to create project from template
        const res = await fetch(`${API_BASE}/api/v1/projects/templates/${templateId}/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (onSelectTemplate) {
            onSelectTemplate(data.project_id || templateId);
          }
          if (onClose) {
            onClose();
          }
        } else {
          // For now, just call the callback (mock behavior)
          if (onSelectTemplate) {
            onSelectTemplate(templateId);
          }
          if (onClose) {
            onClose();
          }
        }
      }
    } catch (err: any) {
      console.warn('Error creating project, using mock:', err.message);
      // Mock: just call the callback
      if (onSelectTemplate) {
        onSelectTemplate(templateId);
      }
      if (onClose) {
        onClose();
      }
    } finally {
      loading[templateId] = false;
      loading = { ...loading };
    }
  }
</script>

{#if show}
  <div
    style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
    "
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      style="
        width: 90%;
        max-width: 900px;
        max-height: 85vh;
        background: #1a1a1f;
        border: 1px solid #333;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      "
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div style="padding: 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <div>
          <h2 style="margin: 0; color: white; font-size: 24px;">New Project</h2>
          <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">
            Start with an empty project or choose a pre-built template. Templates include fully functional workflows with connected nodes and tested prompts.
          </p>
        </div>
        <button
          onclick={onClose}
          style="
            background: transparent;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseenter={(e) => {
            e.currentTarget.style.color = 'white';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.color = '#888';
          }}
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div style="flex: 1; overflow-y: auto; padding: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          <!-- Empty Project (first) -->
          <div
            onclick={() => handleTemplateSelect(emptyProject.id)}
            style="
              padding: 20px;
              background: #25252a;
              border: 1px solid #333;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              flex-direction: column;
            "
            onmouseenter={(e) => {
              e.currentTarget.style.background = '#2a2a2f';
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.2)';
            }}
            onmouseleave={(e) => {
              e.currentTarget.style.background = '#25252a';
              e.currentTarget.style.borderColor = '#333';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="font-size: 32px;">{emptyProject.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 16px; color: white; margin-bottom: 4px;">
                  {emptyProject.name}
                </div>
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">
                  {emptyProject.category}
                </div>
              </div>
            </div>

            <div style="font-size: 14px; color: #ccc; margin-bottom: 16px; line-height: 1.5;">
              {emptyProject.description}
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 12px; color: #888; margin-bottom: 8px; text-transform: uppercase;">
                Features:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                {#each emptyProject.features as feature}
                  <span style="
                    padding: 4px 8px;
                    background: #1a1a1f;
                    border: 1px solid #333;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #aaa;
                  ">
                    {feature}
                  </span>
                {/each}
              </div>
            </div>

            <div style="
              margin-top: auto;
              padding-top: 12px;
              border-top: 1px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span style="font-size: 12px; color: #666;">
                {emptyProject.estimatedTime}
              </span>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(emptyProject.id);
                }}
                disabled={loading[emptyProject.id]}
                style="
                  padding: 6px 16px;
                  background: {loading[emptyProject.id] ? '#555' : '#007bff'};
                  border: 1px solid {loading[emptyProject.id] ? '#444' : '#007bff'};
                  border-radius: 4px;
                  color: white;
                  font-size: 13px;
                  cursor: {loading[emptyProject.id] ? 'not-allowed' : 'pointer'};
                  transition: all 0.2s;
                "
                onmouseenter={(e) => {
                  if (!loading[emptyProject.id]) {
                    e.currentTarget.style.background = '#0056b3';
                  }
                }}
                onmouseleave={(e) => {
                  if (!loading[emptyProject.id]) {
                    e.currentTarget.style.background = '#007bff';
                  }
                }}
              >
                {loading[emptyProject.id] ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>

          <!-- Templates -->
          {#each templates as template}
            <div
              onclick={() => handleTemplateSelect(template.id)}
              style="
                padding: 20px;
                background: #25252a;
                border: 1px solid #333;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
              "
              onmouseenter={(e) => {
                e.currentTarget.style.background = '#2a2a2f';
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.2)';
              }}
              onmouseleave={(e) => {
                e.currentTarget.style.background = '#25252a';
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="font-size: 32px;">{template.icon}</div>
                <div style="flex: 1;">
                  <div style="font-weight: bold; font-size: 16px; color: white; margin-bottom: 4px;">
                    {template.name}
                  </div>
                  <div style="font-size: 12px; color: #666; text-transform: uppercase;">
                    {template.category}
                  </div>
                </div>
              </div>

              <div style="font-size: 14px; color: #ccc; margin-bottom: 16px; line-height: 1.5;">
                {template.description}
              </div>

              <div style="margin-bottom: 16px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 8px; text-transform: uppercase;">
                  Features:
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  {#each template.features as feature}
                    <span style="
                      padding: 4px 8px;
                      background: #1a1a1f;
                      border: 1px solid #333;
                      border-radius: 4px;
                      font-size: 11px;
                      color: #aaa;
                    ">
                      {feature}
                    </span>
                  {/each}
                </div>
              </div>

              <div style="
                margin-top: auto;
                padding-top: 12px;
                border-top: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span style="font-size: 12px; color: #666;">
                  {template.estimatedTime}
                </span>
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template.id);
                  }}
                  disabled={loading[template.id]}
                  style="
                    padding: 6px 16px;
                    background: {loading[template.id] ? '#555' : '#007bff'};
                    border: 1px solid {loading[template.id] ? '#444' : '#007bff'};
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                    cursor: {loading[template.id] ? 'not-allowed' : 'pointer'};
                    transition: all 0.2s;
                  "
                  onmouseenter={(e) => {
                    if (!loading[template.id]) {
                      e.currentTarget.style.background = '#0056b3';
                    }
                  }}
                  onmouseleave={(e) => {
                    if (!loading[template.id]) {
                      e.currentTarget.style.background = '#007bff';
                    }
                  }}
                >
                  {loading[template.id] ? 'Creating...' : 'Use Template'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div style="
        padding: 15px 20px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
      ">
        <button
          onclick={onClose}
          style="
            padding: 8px 16px;
            background: #25252a;
            border: 1px solid #333;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            cursor: pointer;
          "
          onmouseenter={(e) => {
            e.currentTarget.style.background = '#2a2a2f';
            e.currentTarget.style.borderColor = '#444';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.background = '#25252a';
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

