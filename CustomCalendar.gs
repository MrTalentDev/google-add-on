var calendarName = "Do not delete";

/*
 * This function is a function that ommit some letters.
 *
 */

function omite(text) {
  text = text.replace(/[\n\r]/g, " ");
  return text.length > 50
    ? text.slice(0, 25) + " ... " + text.slice(-15)
    : text;
}

/*
 * This function is a function that find the calendar Id which hidden.
 *
 */

function getHiddenCalendarId() {
  var cals = Calendar.CalendarList.list({
    showHidden: true,
    minAccessRole: "owner",
    fields: "items(id,summary)",
  }).items;

  for (var i = 0; i < cals.length; i++)
    if (cals[i].summary == calendarName) return cals[i].id;
  return null;
}

/*
 * This function is a function that show the special events list in 'Do not delete' calendar.
 * So when we open the right side panel, they can find the event that they register
 *
 */

function onCalendarHomePageOpen() {
  var triggers = ScriptApp.getProjectTriggers();
  var addOnName = "onEventUpdate";
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction().indexOf(addOnName) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger("onEventUpdate")
    .forUserCalendar(Session.getActiveUser().getEmail())
    .onEventUpdated()
    .create();

  var card = CardService.newCardBuilder()
    .setName("Card name")
    .setHeader(
      CardService.newCardHeader().setTitle("This is special events list.")
    );

  var calId = getHiddenCalendarId();
  var calendar =
    calId !== null
      ? CalendarApp.getCalendarById(calId)
      : CalendarApp.createCalendar(calendarName, {
          summary: "This is special events list.",
          color: CalendarApp.Color.RED_ORANGE,
          hidden: true,
          selected: false,
          timeZone: CalendarApp.getDefaultCalendar().getTimeZone(),
        });

  var today = new Date();
  var specialEvents = calendar.getEventsForDay(today);
  if (specialEvents.length === 0) {
    card.addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText("No special events in list.")
      )
    );
  } else {
    for (var i = 0; i < specialEvents.length; i++) {
      var description = specialEvents[i].getDescription();
      card.addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newTextParagraph().setText(
              specialEvents[i].getTitle() === ""
                ? "No Title"
                : specialEvents[i].getTitle()
            )
          )
          .addWidget(
            CardService.newTextParagraph().setText(
              specialEvents[i].getDescription() === ""
                ? "No Description"
                : omite(description)
            )
          )
          .addWidget(
            CardService.newButtonSet().addButton(
              CardService.newTextButton()
                .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
                .setText("Edit")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("editClicked")
                    .setParameters({ clickedEventId: specialEvents[i].getId() })
                )
            )
          )
      );
    }
  }
  card = card.build();

  return card;
}

/*
 * This function is a function called when event button which is located right side clicked.
 * So in that function, we redirect to Google event edition page.
 *
 */
var clickedEventId = "";

function editClicked(e) {
  clickedEventId = e.parameters.clickedEventId;
  var calId = getHiddenCalendarId();
  if (calId === null) return;
  var event = CalendarApp.getCalendarById(calId).getEventById(clickedEventId);
  var eventUrl =
    "https://calendar.google.com/calendar/r/eventedit?" +
    encodeURI(
      "text=" +
        event.getTitle() +
        "&dates=" +
        new Date().toLocaleString() +
        "/" +
        new Date(new Date().getTime() + 30 * 60 * 1000).toLocaleString() +
        "&details=" +
        event.getDescription()
    );
  Logger.log(eventUrl);
  return CardService.newActionResponseBuilder()
    .setOpenLink(
      CardService.newOpenLink()
        .setUrl(eventUrl)
        .setOpenAs(CardService.OpenAs.FULL_SIZE)
        .setOnClose(CardService.OnClose.RELOAD)
    )
    .build();
}

/*
 * This function is a function that delete the special event when user delete the real event.
 *
 */

function onEventUpdate(e) {
  var today = new Date(new Date().getTime() - 1 * 60 * 1000).toISOString();
  var calId = getHiddenCalendarId();
  if (calId === null) return;
  var event = Calendar.Events.list(CalendarApp.getDefaultCalendar().getId(), {
    fields: "items(id,summary,status)",
    maxResults: 1,
    updatedMin: today,
    orderBy: "updated",
  }).items[0];
  Logger.log(event.status);
  var userEvent = CalendarApp.getDefaultCalendar().getEventById(event.id);
  var specialEvents = CalendarApp.getCalendarById(calId).getEventsForDay(
    new Date()
  );
  for (var i = 0; i < specialEvents.length; i++) {
    if (specialEvents[i].getTitle() === userEvent.getTitle()) {
      var allEvents = CalendarApp.getCalendarById(calId).getEventSeriesById(
        specialEvents[i].getId()
      );
      allEvents.deleteEventSeries();
    }
  }
}

/*
 * This function is a function that show the selected event in more detail on right side window.
 *
 */

function onCalendarEventOpen(e) {
  if (e.calendar === undefined) return;

  var event = CalendarApp.getEventById(e.calendar.id);
  var cardSection = CardService.newCardSection();
  var newFlag = event === null;
  var ownerFalg =
    e.calendar.organizer.email === Session.getActiveUser().getEmail();

  cardSection.addWidget(
    CardService.newTextParagraph().setText(
      newFlag
        ? "Add to speical events list"
        : event.getTitle() === ""
        ? "No Title"
        : event.getTitle()
    )
  );
  cardSection.addWidget(
    CardService.newTextParagraph().setText(
      newFlag
        ? "You can add new event after save event."
        : event.getDescription() === ""
        ? "No description"
        : omite(event.getDescription())
    )
  );
  if (!newFlag) {
    cardSection.addWidget(
      CardService.newTextParagraph().setText(
        event.getStartTime() + " ~ " + event.getEndTime()
      )
    );
  }
  if (ownerFalg && !newFlag) {
    cardSection.addWidget(
      CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText("Add event")
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(
            CardService.newAction().setFunctionName("addSpecialEvent")
          )
      )
    );
  }

  var card = CardService.newCardBuilder()
    .setName("Card name")
    .setHeader(CardService.newCardHeader().setTitle("Calendar Event Create"))
    .addSection(cardSection)
    .build();

  return card;
}

/*
 * This function is a function that creates an event to Special events list.
 * If there are calendar named 'Do not delete', it creates only event to that calendar.
 * And if there aren't, it creates a calendar named 'Do not delete'.
 * And users can view that calendar on their calendar setting.
 *
 */

function addSpecialEvent(event) {
  var calId = getHiddenCalendarId();
  var calendar =
    calId !== null
      ? CalendarApp.getCalendarById(calId)
      : CalendarApp.createCalendar(calendarName, {
          summary: "This is special events list.",
          color: CalendarApp.Color.RED_ORANGE,
          hidden: true,
          selected: false,
          timeZone: CalendarApp.getDefaultCalendar().getTimeZone(),
        });

  var userEvent = CalendarApp.getDefaultCalendar().getEventById(
    event.calendar.id
  );
  var currentTime = new Date();
  var title = userEvent.getTitle();
  var description = userEvent.getDescription();

  calendar.createEventSeries(
    title,
    currentTime,
    currentTime,
    CalendarApp.newRecurrence().addDailyRule(),
    { description }
  );
  userEvent.deleteEvent();
}
