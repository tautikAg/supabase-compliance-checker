const fetch = require('node-fetch');

class ComplianceService {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.supabase.com';
        console.log('ComplianceService initialized with token:', this.accessToken.substring(0, 10) + '...');
    }

    async checkMFA() {
        console.log('Checking MFA status...');
        try {
            const response = await fetch(`${this.baseUrl}/v1/projects`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('MFA check response status:', response.status);
            const data = await response.json();
            console.log('Raw projects response:', data);

            if (!Array.isArray(data)) {
                console.error('Projects response is not an array:', data);
                return {
                    error: 'Invalid response format',
                    rawResponse: data
                };
            }

            const mfaStatus = await Promise.all(data.map(async (project) => {
                const authSettingsResponse = await fetch(
                    `${this.baseUrl}/v1/projects/${project.id}/auth/config`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const authSettings = await authSettingsResponse.json();
                console.log(`Auth settings for project ${project.id}:`, authSettings);
                
                return {
                    projectId: project.id,
                    name: project.name,
                    organization: project.organization_id,
                    mfaEnabled: authSettings?.sms_provider !== 'NONE' || 
                               authSettings?.enable_totp || 
                               false,
                    authSettings: authSettings
                };
            }));
            
            console.log('Processed MFA status:', mfaStatus);
            return mfaStatus;
        } catch (error) {
            console.error('MFA check error:', error);
            return {
                error: error.message,
                details: 'Failed to check MFA status'
            };
        }
    }

    async checkRLS() {
        console.log('Checking RLS status...');
        try {
            const response = await fetch(`${this.baseUrl}/v1/projects`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const projects = await response.json();
            const rlsStatus = await Promise.all(projects.map(async (project) => {
                const tablesResponse = await fetch(
                    `${this.baseUrl}/v1/projects/${project.id}/database/tables`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const tables = await tablesResponse.json();
                return {
                    projectId: project.id,
                    name: project.name,
                    tables: tables.map(table => ({
                        name: table.name,
                        hasRLS: table.rls_enabled,
                        policies: table.policies || []
                    }))
                };
            }));

            return rlsStatus;
        } catch (error) {
            console.error('RLS check error:', error);
            return {
                error: error.message,
                details: 'Failed to check RLS status'
            };
        }
    }

    async checkPITR() {
        console.log('Checking PITR status...');
        try {
            const response = await fetch(`${this.baseUrl}/v1/projects`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const projects = await response.json();
            const pitrStatus = await Promise.all(projects.map(async (project) => {
                const backupResponse = await fetch(
                    `${this.baseUrl}/v1/projects/${project.id}/database/backups`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const backupSettings = await backupResponse.json();
                return {
                    projectId: project.id,
                    name: project.name,
                    pitrEnabled: backupSettings?.pitr_enabled || false,
                    backupSettings: backupSettings
                };
            }));

            return pitrStatus;
        } catch (error) {
            console.error('PITR check error:', error);
            return {
                error: error.message,
                details: 'Failed to check PITR status'
            };
        }
    }
}

module.exports = ComplianceService; 