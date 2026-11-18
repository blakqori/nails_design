/* NAILS DESIGN - Booking API; frontend on index.html */
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000" : "/api";
  const form = document.getElementById("booking-form");
  const service = document.getElementById("booking-service");
  const date = document.getElementById("booking-date");
  const time = document.getElementById("booking-time");
  const name = document.getElementById("booking-name");
  const phone = document.getElementById("booking-phone");
  const email = document.getElementById("booking-email");
  const message = document.getElementById("booking-message");
  if (![form,service,date,time,name,phone,email,message].every(Boolean)) return;
  const submit = form.querySelector('button[type="submit"]');
  const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  date.min = localDate(new Date());
  const showMessage = (txt,success=false) => {message.textContent=txt;message.style.color=success?"#278052":"#b13d5d";};
  const resetTimes = (txt="Së pari zgjidh shërbimin dhe datën") => {
    time.replaceChildren(new Option(txt,""));time.disabled=true;
  };
  
async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/services`);

    if (!response.ok) {
      throw new Error("Services HTTP " + response.status);
    }

    const services = await response.json();

    service.replaceChildren(
      new Option("Zgjidh shërbimin", "")
    );

    services
      .filter((s) => s.is_active === true)
      .forEach((s) => {
        const option = new Option(
          `${s.name} - ${s.price}€ (${s.duration_minutes} min)`,
          String(s.id)
        );

        option.dataset.imageUrl = s.image_url || "";

        service.add(option);
      });

  } catch (e) {
    console.error(e);
    showMessage(
      "Shërbimet nuk u ngarkuan. Kontrollo serverin."
    );
  }
}

  let requestNumber=0;
  async function loadSlots() {
    const request=++requestNumber;
    resetTimes();showMessage("");
    if (!service.value || !date.value) return;
    if (date.value < localDate(new Date())) {showMessage("Nuk mund të zgjedhësh datë të kaluar.");return;}
    resetTimes("Duke ngarkuar oraret...");
    try {
      const params = new URLSearchParams({date:date.value,service_id:service.value});
      const response=await fetch(`${API_URL}/available-slots?${params}`);
      if(!response.ok) throw new Error("Slots HTTP " + response.status);
      const data=await response.json();
      if(request!==requestNumber)return;
      const now=new Date();
      const slots=(data.availableSlots||[]).filter(slot => {
        if(date.value>localDate(now))return true;
        const [h,m]=slot.split(":").map(Number);
        return date.value===localDate(now) && h*60+m>now.getHours()*60+now.getMinutes();
      });
      if(!slots.length){resetTimes("Nuk ka orare të lira");return;}
      time.replaceChildren(new Option("Zgjidh orën",""));
      slots.forEach(slot=>time.add(new Option(slot,slot)));
      time.disabled=false;
    }catch(e){if(request!==requestNumber)return;console.error(e);resetTimes("Orari nuk u ngarkua");showMessage("Nuk mund të ngarkohen oraret. Provo përsëri.");}
  }
  service.addEventListener("change",loadSlots);
  date.addEventListener("change",loadSlots);
  let submitting=false;
  form.addEventListener("submit",async e=>{
    e.preventDefault();if(submitting)return;
    const fields=[service,date,time,name,phone,email];
    const invalid=fields.find(field=>!field.checkValidity());
    if(invalid){showMessage("Kontrollo të dhënat e rezervimit.");invalid.reportValidity();return;}
    const data={full_name:name.value.trim(),phone:phone.value.trim(),email:email.value.trim()||null,service_id:Number(service.value),appointment_date:date.value,start_time:time.value};
    if(!data.full_name||!data.phone){showMessage("Plotëso emrin dhe telefonin.");return;}
    submitting=true;if(submit)submit.disabled=true;showMessage("Duke ruajtur rezervimin...");
    try{
      const response=await fetch(`${API_URL}/appointments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await response.json();
      if(!response.ok){
        if(response.status===409){await loadSlots();showMessage("Ky termin është zënë. Zgjidh orë tjetër.");}
        else showMessage(result.message||"Rezervimi dështoi.");
        return;
      }
      if(response.status!==201||result.success!==true||!result.appointment?.id){
        console.error("Unexpected response",result);showMessage("Serveri nuk e konfirmoi rezervimin. Kontrollo para se ta provosh përsëri.");return;
      }
      form.reset();date.min=localDate(new Date());resetTimes();
      form.dispatchEvent(new CustomEvent("booking:success",{bubbles:true}));
      showMessage("Rezervimi u regjistrua me sukses! Ju lutemi prisni konfirmimin.",true);
    }catch(err){console.error(err);showMessage("Nuk mund të konfirmohet rezervimi. Kontrollo para se ta provosh përsëri.");}
    finally{submitting=false;if(submit)submit.disabled=false;}
  });
  loadServices();
});
