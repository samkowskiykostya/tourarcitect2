
import { Tour } from '../types';
import JSZip from 'jszip';
import { dump } from 'js-yaml';

export const exportService = {
  generateHTML: (tour: Tour): string => {
    const cardsHtml = tour.cards.map((card, idx) => {
      const taskHtml = card.task ? `
        <div class="section">
          <h3>Task</h3>
          <p>${card.task}</p>
          ${card.taskHints.length ? `<ul>${card.taskHints.map(h => `<li>Hint (${h.price} pts): ${h.text}</li>`).join('')}</ul>` : ''}
        </div>
      ` : '';

      const questionsHtml = card.questions.length ? `
        <div class="section">
          <h3>Questions</h3>
          ${card.questions.map((q, qIdx) => `
            <div class="question">
              <p><strong>Q${qIdx + 1} (${q.price} pts):</strong> ${q.text}</p>
              ${q.hints.length ? `<ul>${q.hints.map(h => `<li>Hint (${h.price} pts): ${h.text}</li>`).join('')}</ul>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '';

      return `
      <div class="card">
        <h2>${idx + 1}. ${card.name || 'Untitled Location'}</h2>
        <p class="coords">📍 ${card.lat}, ${card.lng}</p>
        <p class="desc">${card.description || 'No description provided.'}</p>
        ${questionsHtml}
        ${taskHtml}
        <div class="images">
          ${card.images.map((img, i) => `<img src="images/card_${idx}_img_${i}.jpg" />`).join('')}
        </div>
      </div>
    `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${tour.name}</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f0f0f0; }
          .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { color: #1a1a1a; }
          h2 { margin-top: 0; color: #2563eb; }
          h3 { margin-bottom: 5px; color: #475569; font-size: 1.1em; }
          .section { margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          .question { margin-bottom: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; }
          .coords { color: #666; font-size: 0.9em; font-family: monospace; }
          .desc { line-height: 1.6; color: #333; }
          .images { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
          img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; }
          ul { margin: 5px 0; padding-left: 20px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Tour: ${tour.name}</h1>
        ${cardsHtml}
      </body>
      </html>
    `;
  },

  exportToZip: async (tour: Tour) => {
    const zip = new JSZip();
    const html = exportService.generateHTML(tour);
    zip.file("index.html", html);
    
    const imgFolder = zip.folder("images");
    if (imgFolder) {
      tour.cards.forEach((card, cIdx) => {
        card.images.forEach((base64, iIdx) => {
          const data = base64.split(',')[1];
          imgFolder.file(`card_${cIdx}_img_${iIdx}.jpg`, data, { base64: true });
        });
      });
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tour.name.replace(/\s+/g, '_')}_tour.zip`;
    link.click();
  },

  exportToGoogleMaps: (tour: Tour) => {
    const validCards = tour.cards.filter(c => c.lat !== null && c.lng !== null);
    if (validCards.length === 0) {
      alert("No locations with coordinates found to export.");
      return;
    }
    
    const origin = `${validCards[0].lat},${validCards[0].lng}`;
    const destination = `${validCards[validCards.length - 1].lat},${validCards[validCards.length - 1].lng}`;
    const waypoints = validCards.slice(1, -1).map(c => `${c.lat},${c.lng}`).join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`;
    window.open(url, '_blank');
  },

  exportToYamlString: (tour: Tour): string => {
    const yamlStructure = {
      meta: {
        version: 1,
        lang: "ua"
      },
      steps: tour.cards.map((card, idx) => {
        const step: any = {
          id: card.id || `step_${idx + 1}`,
          image: card.images.length > 0 ? `image_${idx}.jpg` : "",
          title: { ua: card.name || "" },
          text: { ua: card.description || "" },
        };

        if (card.questions && card.questions.length > 0) {
          step.questions = card.questions.map((q, qIdx) => ({
            id: q.id || `q_${idx}_${qIdx}`,
            text: { ua: q.text || "" },
            answerType: "text",
            answerCost: q.price || 0,
            answers: { ua: [] }, 
            hints: q.hints.map(h => ({ ua: h.text, price: h.price }))
          }));
        }

        if (card.task) {
          step.task = { ua: card.task };
        }

        if (card.taskHints && card.taskHints.length > 0) {
          step.task_hints = card.taskHints.map(h => ({ ua: h.text, price: h.price }));
        }

        if (card.lat && card.lng) {
          step.coordinates = `${card.lat}, ${card.lng}`;
        }

        return step;
      })
    };

    const yamlString = dump(yamlStructure, {
        lineWidth: -1, 
        noRefs: true,
        indent: 2
    });
    
    return `# Unified Tour YAML Schema Specification\n# Version: 1.0\n\n${yamlString}`;
  },

  exportToYaml: (tour: Tour) => {
    const finalOutput = exportService.exportToYamlString(tour);
    const blob = new Blob([finalOutput], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tour.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.yaml`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },

  sendToCreators: (tour: Tour) => {
    const finalOutput = exportService.exportToYamlString(tour);
    const subject = encodeURIComponent(`Tour Export: ${tour.name}`);
    const body = encodeURIComponent(finalOutput);
    window.location.href = `mailto:aiinject@gmail.com?subject=${subject}&body=${body}`;
  }
};
