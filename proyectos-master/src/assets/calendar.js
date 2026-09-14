$(function(){
    function pageLoad(){
        $('#external-events').find('div.external-event').each(function() {

            // create an Event Object (http://arshaw.com/fullcalendar/docs/event_data/Event_Object/)
            // it doesn't need to have a start or end
            var eventObject = {
                title: $.trim($(this).text()) // use the element's text as the event title
            };

            // store the Event Object in the DOM element so we can get to it later
            $(this).data('eventObject', eventObject);

            // make the event draggable using jQuery UI
            $(this).draggable({
                zIndex: 999,
                revert: true,      // will cause the event to go back to its
                revertDuration: 0  //  original position after the drag
            });

        });

        var date = new Date();
        var d = date.getDate();
        var m = date.getMonth();
        var y = date.getFullYear();
        var $calendar;

        $.get( "http://localhost:4359/api/Calendario/", function( data ){
            //console.log(data);

            $calendar= $('#calendar').fullCalendar({
                header: {
                    left: '',
                    center: '',
                    right: ''
                },

                selectable: true,
                selectHelper: true,
                select: function(start, end, allDay) {
                    var url = "http://localhost:4359/api/Calendario/GetCalendarioDiario/Fecha="+start.getFullYear()+"-"+(start.getMonth()+1)+"-"+start.getDate();
                    console.log(url);
                    $.get( url, function( dataDia ){
                        var widget = $("#widget");
                        var widgetbody,h5,row, label,br;
                        
                        console.log(dataDia);

                        widget.empty();

                        for (let i = 0; i < dataDia.length; i++) {
                            widgetbody=document.createElement("div");

                            widgetbody.setAttribute("class","widget-body");
                            widgetbody.setAttribute("style","padding: 1rem;border-radius: 8px;background-color:"+dataDia[i].backgroundColor);

                            h5=document.createElement("h5");
                            h5.innerHTML="Detalle Licitación";
                            h5.setAttribute("style","font-weight: bold;");
                            widgetbody.appendChild(h5);

                            //Licitación
                            row=document.createElement("div");
                            row.setAttribute("class","row");
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-2 form-control-label");
                            label.setAttribute("style","font-weight: bold;");
                            label.innerHTML="Licitacion:";
                            row.appendChild(label);
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-8 form-control-label");
                            label.innerHTML=dataDia[i].Descripcion;
                            row.appendChild(label);
                            widgetbody.appendChild(row);

                            //Hito
                            row=document.createElement("div");
                            row.setAttribute("class","row");
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-2 form-control-label");
                            label.setAttribute("style","font-weight: bold;");
                            label.innerHTML="Hito:";
                            row.appendChild(label);
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-8 form-control-label");
                            label.innerHTML=dataDia[i].NombreHito;
                            row.appendChild(label);
                            widgetbody.appendChild(row);

                            //Mandante
                            row=document.createElement("div");
                            row.setAttribute("class","row");
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-2 form-control-label");
                            label.setAttribute("style","font-weight: bold;");
                            label.innerHTML="Mandante:";
                            row.appendChild(label);
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-8 form-control-label");
                            label.innerHTML=dataDia[i].NombreMandante;
                            row.appendChild(label);
                            widgetbody.appendChild(row);

                            //Ejecutivo
                            row=document.createElement("div");
                            row.setAttribute("class","row");
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-2 form-control-label");
                            label.setAttribute("style","font-weight: bold;");
                            label.innerHTML="Ejecutivo:";
                            row.appendChild(label);
                            label=document.createElement("label");
                            label.setAttribute("class","col-md-8 form-control-label");
                            label.innerHTML=dataDia[i].NombreEjecutivo;
                            row.appendChild(label);
                            widgetbody.appendChild(row);

                            //Agrega la tarea completa
                            widget.append(widgetbody);

                            //Salto de linea
                            br=document.createElement("br");
                            widget.append(br);
                        }
                        
                    })
                },
                editable: true,
                droppable:true,

                drop: function(date, allDay) { // this function is called when something is dropped

                    // retrieve the dropped element's stored Event Object
                    var originalEventObject = $(this).data('eventObject');

                    // we need to copy it, so that multiple events don't have a reference to the same object
                    var copiedEventObject = $.extend({}, originalEventObject);

                    // assign it the date that was reported
                    copiedEventObject.start = date;
                    copiedEventObject.allDay = allDay;

                    var $categoryClass = $(this).data('event-class');
                    if ($categoryClass)
                        copiedEventObject['className'] = [$categoryClass];

                    // render the event on the calendar
                    // the last `true` argument determines if the event "sticks" (http://arshaw.com/fullcalendar/docs/event_rendering/renderEvent/)
                    $('#calendar').fullCalendar('renderEvent', copiedEventObject, true);

                    $(this).remove();

                },

                // US Holidays
                events: data,

                eventClick: function(event) {
                    // opens events in a popup window
                    if (event.url){
                        window.open(event.url, 'gcalevent', 'width=700,height=600');
                        return false
                    } else {
                        var $modal = $("#myModal"),
                            $modalLabel = $("#myModalLabel");
                        $modalLabel.html(event.title);
                        $modal.find(".modal-body p").html(function(){
                            if (event.allDay){
                                return "All day event"
                            } else {
                                return "Start At: <strong>" + event.start.getHours() + ":" + (event.start.getMinutes() == 0 ? "00" : event.start.getMinutes()) + "</strong></br>"
                                    + (event.end == null ? "" : "End At: <strong>" + event.end.getHours() + ":" + (event.end.getMinutes() == 0 ? "00" : event.end.getMinutes()) + "</strong>")
                            }
                        }());
                        $modal.modal('show');
                    }
                }

            })
        

            $("#calendar-switcher").find("label").click(function(){
                $calendar.fullCalendar( 'changeView', $(this).find('input').val() )
            });

            var currentDate = $calendar.fullCalendar('getDate');

            $('#calender-current-date').html(
                    $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
                    " - <span class='fw-semi-bold'>" +
                    $.fullCalendar.formatDate(currentDate, "dddd") +
                    "</span>"
            );


            $('#calender-prev').click(function(){
                $calendar.fullCalendar( 'prev' );
                currentDate = $calendar.fullCalendar('getDate');
                $('#calender-current-date').html(
                        $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
                        " - <span class='fw-semi-bold'>" +
                        $.fullCalendar.formatDate(currentDate, "dddd") +
                        "</span>"
                );
            });
            $('#calender-next').click(function(){
                $calendar.fullCalendar( 'next' );
                currentDate = $calendar.fullCalendar('getDate');
                $('#calender-current-date').html(
                        $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
                        " - <span class='fw-semi-bold'>" +
                        $.fullCalendar.formatDate(currentDate, "dddd") +
                        "</span>"
                );
            });
        });
    }
    pageLoad();
    SingApp.onPageLoad(pageLoad);
});