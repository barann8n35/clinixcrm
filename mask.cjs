const fs = require('fs');
let wf = JSON.parse(fs.readFileSync('core_ai_agent.json', 'utf8'));
let agentNode = wf.nodes.find(n => n.name === 'Sekreter');
if (agentNode && agentNode.parameters && agentNode.parameters.options && agentNode.parameters.options.systemMessage) {
    let sm = agentNode.parameters.options.systemMessage;
    
    // Mask surname
    sm = sm.replace(
        "{{ $('Get Patient Data').item.json.surname || 'YOK' }}", 
        "{{ $('Get Patient Data').item.json.surname ? $('Get Patient Data').item.json.surname.charAt(0) + '***' : 'YOK' }}"
    );
    
    // Mask phone
    sm = sm.replace(
        "{{ $('Get Patient Data').item.json.phone || 'YOK' }}", 
        "{{ $('Get Patient Data').item.json.phone ? $('Get Patient Data').item.json.phone.substring(0, 4) + '***' + $('Get Patient Data').item.json.phone.slice(-2) : 'YOK' }}"
    );
    
    agentNode.parameters.options.systemMessage = sm;
    fs.writeFileSync('core_ai_agent_masked.json', JSON.stringify(wf, null, 2));
    console.log('Masked file created.');
} else {
    console.log('Sekreter node or systemMessage not found.');
}
