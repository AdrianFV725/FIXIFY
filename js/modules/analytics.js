// ========================================
// ANALYTICS MODULE
// ========================================

const AnalyticsModule = {
    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.renderDashboard();
    },

    async renderDashboard() {
        const container = document.querySelector('.page-content');
        if (!container) return;

        let stats, tickets, machines, licenses, employees;
        
        try {
            stats = await Store.getStats();
            tickets = await Store.getTickets() || [];
            machines = await Store.getMachines() || [];
            licenses = await Store.getLicenses() || [];
            employees = await Store.getEmployees() || [];
        } catch (e) {
            console.error('Error cargando datos:', e);
            stats = { tickets: {}, machines: {}, licenses: {}, employees: {} };
            tickets = [];
            machines = [];
            licenses = [];
            employees = [];
        }

        // Top maquinas problematicas
        const problematicMachines = machines
            .filter(m => (m.ticketCount || 0) > 0)
            .sort((a, b) => (b.ticketCount || 0) - (a.ticketCount || 0))
            .slice(0, 5);

        // Tickets por estado
        const ticketsByStatus = {
            open: tickets.filter(t => t.status === 'open').length,
            in_progress: tickets.filter(t => t.status === 'in_progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length
        };

        // Tickets por categoria
        const ticketsByCategory = {
            hardware: tickets.filter(t => t.category === 'hardware').length,
            software: tickets.filter(t => t.category === 'software').length,
            network: tickets.filter(t => t.category === 'network').length,
            other: tickets.filter(t => t.category === 'other').length
        };

        container.innerHTML = `
            <!-- KPIs Resumen -->
            <section class="kpi-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="kpi-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Total Tickets</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${tickets.length}</div>
                    <div style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.5rem;">${ticketsByStatus.open} abiertos</div>
                </div>
                <div class="kpi-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Maquinas</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${machines.length}</div>
                    <div style="font-size: 0.75rem; color: #22c55e; margin-top: 0.5rem;">${machines.filter(m => m.assignedTo).length} asignadas</div>
                </div>
                <div class="kpi-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Empleados</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${employees.length}</div>
                    <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem;">${employees.filter(e => e.status === 'active').length} activos</div>
                </div>
                <div class="kpi-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <div style="font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Licencias</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${licenses.length}</div>
                    <div style="font-size: 0.75rem; color: #f97316; margin-top: 0.5rem;">${stats.licenses?.expiring || 0} por vencer</div>
                </div>
            </section>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <!-- Tickets por Estado -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1.5rem;">Tickets por Estado</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Abiertos</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByStatus.open / tickets.length * 100) : 0}%; height: 100%; background: #3b82f6;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByStatus.open}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">En Progreso</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByStatus.in_progress / tickets.length * 100) : 0}%; height: 100%; background: #f97316;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByStatus.in_progress}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Resueltos</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByStatus.resolved / tickets.length * 100) : 0}%; height: 100%; background: #22c55e;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByStatus.resolved}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Cerrados</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByStatus.closed / tickets.length * 100) : 0}%; height: 100%; background: #6b7280;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByStatus.closed}</span>
                        </div>
                    </div>
                </div>

                <!-- Tickets por Categoria -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1.5rem;">Tickets por Categoria</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Hardware</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByCategory.hardware / tickets.length * 100) : 0}%; height: 100%; background: #ef4444;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByCategory.hardware}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Software</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByCategory.software / tickets.length * 100) : 0}%; height: 100%; background: #8b5cf6;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByCategory.software}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Red</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByCategory.network / tickets.length * 100) : 0}%; height: 100%; background: #06b6d4;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByCategory.network}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="width: 100px; font-size: 0.875rem;">Otro</span>
                            <div style="flex: 1; height: 24px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${tickets.length ? (ticketsByCategory.other / tickets.length * 100) : 0}%; height: 100%; background: #6b7280;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; font-weight: 600;">${ticketsByCategory.other}</span>
                        </div>
                    </div>
                </div>

                <!-- Maquinas Problematicas -->
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; grid-column: span 2;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1.5rem;">Maquinas con Mas Fallas</h3>
                    ${problematicMachines.length === 0 ? `
                        <p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No hay datos de fallas registradas</p>
                    ` : `
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;">
                            ${problematicMachines.map((m, i) => `
                                <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 1rem; text-align: center;">
                                    <div style="width: 48px; height: 48px; background: rgba(239, 68, 68, ${0.2 - i * 0.03}); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; color: #ef4444; font-weight: 700; font-size: 1.25rem;">
                                        ${m.ticketCount || 0}
                                    </div>
                                    <div style="font-weight: 500; font-size: 0.875rem; margin-bottom: 0.25rem;">${this.escapeHtml(m.name)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m.serialNumber}</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AnalyticsModule.init(), 100);
});

window.AnalyticsModule = AnalyticsModule;
