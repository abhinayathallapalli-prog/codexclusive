import { PatientProfile, ClinicalHistoryRecord } from '../types';

export function generateFhirR4Bundle(patient: PatientProfile, record: ClinicalHistoryRecord) {
  const timestamp = new Date().toISOString();
  const bundleId = `urn:uuid:bundle-${Date.now()}`;

  return {
    resourceType: 'Bundle',
    id: bundleId,
    meta: {
      versionId: '1',
      lastUpdated: timestamp,
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/ClinicalHistoryDocumentBundle'],
    },
    identifier: {
      system: 'https://healthid.ndhm.gov.in',
      value: patient.abhaId,
    },
    type: 'document',
    timestamp: timestamp,
    entry: [
      {
        fullUrl: `urn:uuid:composition-${patient.id}`,
        resource: {
          resourceType: 'Composition',
          id: `comp-${patient.id}`,
          status: 'final',
          type: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '371529009',
                display: 'History and physical report',
              },
            ],
            text: 'MediKiosk AI-Assisted Clinical History Document',
          },
          subject: {
            reference: `urn:uuid:patient-${patient.id}`,
            display: patient.name,
          },
          date: timestamp,
          author: [
            {
              display: 'MediKiosk AI Intake Engine (All India Institute of Ayurveda)',
            },
          ],
          title: 'Structured Clinical History & Medical Document Intake',
          section: [
            {
              title: 'Chief Complaint & History of Present Illness',
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '10154-3',
                    display: 'Chief complaint and history of present illness',
                  },
                ],
              },
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">
                  <p><strong>Chief Complaint:</strong> ${record.chiefComplaint} (${record.durationOfComplaint})</p>
                  <p><strong>SOCRATES Analysis:</strong> Site: ${record.hpi.site || 'N/A'}, Character: ${record.hpi.character}, Severity: ${record.hpi.severity}/10</p>
                  <p><strong>Associated Symptoms:</strong> ${record.hpi.associations.join(', ') || 'None'}</p>
                </div>`,
              },
            },
            {
              title: 'Ayush Dashavidha Pariksha',
              code: {
                coding: [
                  {
                    system: 'https://ayush.gov.in/standards/dashavidha',
                    code: 'DVP-01',
                    display: 'Ayurvedic Ten-Fold Examination',
                  },
                ],
              },
              text: {
                status: 'generated',
                div: record.ayushAssessment
                  ? `<div xmlns="http://www.w3.org/1999/xhtml">
                      <p>Prakriti: ${record.ayushAssessment.prakriti}, Vikriti: ${record.ayushAssessment.vikriti}</p>
                      <p>Agni: ${record.ayushAssessment.agni}, Koshtha: ${record.ayushAssessment.koshtha}</p>
                      <p>Sara: ${record.ayushAssessment.sara}, Samhanana: ${record.ayushAssessment.samhanana}</p>
                    </div>`
                  : '<div>Non-Ayush Track</div>',
              },
            },
            {
              title: 'Medication Statement',
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '10160-0',
                    display: 'History of medication use',
                  },
                ],
              },
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">
                  <ul>
                    ${record.currentMedications.map(m => `<li>${m.name} ${m.dosage} (${m.frequency})</li>`).join('')}
                  </ul>
                </div>`,
              },
            },
            {
              title: 'Prior Digitized Documents & Investigations',
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '30954-2',
                    display: 'Relevant diagnostic tests/laboratory data',
                  },
                ],
              },
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">
                  <p>Digitized Documents count: ${record.documents.length}</p>
                  <p>Total extracted records: ${record.documents.flatMap(d => d.extractedLabResults).length} lab tests, ${record.documents.flatMap(d => d.extractedMedications).length} prescriptions.</p>
                </div>`,
              },
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:patient-${patient.id}`,
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            {
              type: {
                coding: [
                  {
                    system: 'https://healthid.ndhm.gov.in',
                    code: 'ABHA',
                    display: 'Ayushman Bharat Health Account',
                  },
                ],
              },
              system: 'https://healthid.ndhm.gov.in',
              value: patient.abhaId,
            },
          ],
          name: [
            {
              text: patient.name,
            },
          ],
          telecom: [
            {
              system: 'phone',
              value: patient.phone,
            },
          ],
          gender: patient.gender,
          address: [
            {
              line: [patient.address],
              district: patient.district,
              state: patient.state,
              country: 'India',
            },
          ],
        },
      },
      {
        fullUrl: `urn:uuid:encounter-${patient.tokenNumber}`,
        resource: {
          resourceType: 'Encounter',
          id: `enc-${patient.tokenNumber}`,
          status: 'arrived',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory (OPD)',
          },
          serviceProvider: {
            display: 'All India Institute of Ayurveda (AIIA), New Delhi',
          },
          subject: {
            reference: `urn:uuid:patient-${patient.id}`,
            display: patient.name,
          },
        },
      },
    ],
  };
}
