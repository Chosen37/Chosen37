/* Shared pure summary/date functions: no network requests or persistent storage. */
(function(root) {
  'use strict';
  const optional = value => String(value || '').trim() || 'Not provided';
  function today(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function nextDay(value) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate()+1);
    return today(date);
  }
  function dateError(start, end, current = today()) {
    if (start && start < current) return {field:'checkin',message:'Choose today or a future check-in date.'};
    if (start && end && end <= start) return {field:'checkout',message:'Check-out must be after check-in.'};
    return null;
  }
  const contact = value => ['Name: '+optional(value.name),'Email: '+optional(value.email),'Phone: '+optional(value.phone)];
  function summary(kind, value, data) {
    const lines = ['VAIL BREEZE PROPERTIES',kind==='stay'?'STAY PLAN':'OWNER INQUIRY DRAFT','', 'Prepared locally — not sent to Vail Breeze.',''];
    if(kind==='stay') {
      const property = data.properties.find(p=>p.id===value.property);
      const reference = property ? property.name+' — '+property.location : 'No preference / help me choose';
      lines.push('Preferred stay: '+reference,'Check-in: '+optional(value.checkin),'Check-out: '+optional(value.checkout),'Guests: '+optional(value.guests),'Purpose: '+optional(value.purpose),'Preferences & questions: '+optional(value.message));
      if(property)lines.push('View current rates & availability: '+property.url);
    } else {
      const plan = data.plans.find(p=>p.id===value.plan);
      lines.push('Property city or address: '+optional(value.location),'Number of properties: '+optional(value.properties),'Management interest: '+(plan?`${plan.name} — ${plan.rate}% proposed management fee`:'Help me decide'),'Goals & questions: '+optional(value.message));
    }
    lines.push('','OPTIONAL CONTACT DETAILS',...contact(value),'',kind==='stay'?'This plan is not a reservation. Open the selected Airbnb listing, enter your dates, and confirm availability, the full price, and house rules before booking.':'Confirm service availability, fee basis, included services, additional charges, and written terms before any management agreement.',kind==='stay'?'Book or message the host on Airbnb. Nothing has been submitted by this planner.':'To contact Vail Breeze: vailbreezeproperties@gmail.com | (720) 828-2021. Review and send your draft in your email app. Nothing has been sent automatically.');
    return lines.join('\n');
  }
  function emailDraft(kind, text) {
    const subject=kind==='stay'?'Furnished stay inquiry':'Property management proposal inquiry';
    return 'mailto:vailbreezeproperties@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
  }
  root.VailPlanner = { today, nextDay, dateError, summary, emailDraft };
})(typeof window === 'undefined' ? globalThis : window);
