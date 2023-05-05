var majorName = '(Do not delete)';
var calendarName = Session.getActiveUser().getEmail() + majorName;

/* --------------------------- Utilities --------------------------- */

/**
 * This function is a function that ommit some letters
 */

function omite(text) {
  text = text.replace(/[\n\r]/g, ' ');
  return text.length > 40 ? text.slice(0, 20) + ' ... ' + text.slice(-10) : text
}

/**
 * This function is a function that find the shared people of someone's calendar
 */

function getSharedPeople(calendarId) {
  // Retrieve the access control list for the specified calendar
  var acl = Calendar.Acl.list(calendarId).items.filter(item => item.scope.type === 'user');

  // Extract the email addresses of individuals who have been granted access
  var sharedPeople = acl.map(function (rule) {
    return {
      email: rule.scope.value,
      role: rule.role
    };
  });

  // Return the email addresses of shared people
  return sharedPeople;
}

/**
 * Set up calendar sharing for a single user. Refer to 
 * https://developers.google.com/google-apps/calendar/v3/reference/acl/insert.
 *
 * @param {string} calId   Calendar ID
 * @param {string} user    Email address to share with
 * @param {string} role    Optional permissions, default = 'reader':
 *                         'none, 'freeBusyReader', 'reader', 'writer', 'owner'
 *
 * @returns {aclResource}  See https://developers.google.com/google-apps/calendar/v3/reference/acl#resource
 */

function shareCalendar(calId, user, role) {
  role = role || 'reader';

  var acl = null;

  // Check whether there is already a rule for this user
  try {
    acl = Calendar.Acl.get(calId, 'user:' + user);
  } catch (e) {
    // no existing acl record for this user - as expected. Carry on.
    Logger.log(e);
  }

  var newRule = null;

  if (!acl) {
    // No existing rule - insert one.
    acl = {
      'scope': {
        'type': 'user',
        'value': user
      },
      'role': role
    };
    newRule = Calendar.Acl.insert(acl, calId);
  } else {
    if (acl.role !== role) {
      acl.role = role;
      newRule = Calendar.Acl.update(acl, calId, acl.id);
    }
  }

  return newRule;
}

/**
 * This function is a function that find the calendar Id which hidden
 */

function getMyHiddenCalendarId() {
  var hiddenCal = []
  // Get hiddend calendar list
  var cals = Calendar.CalendarList.list({
    showHidden: true,
    fields: 'items(id, summary, accessRole)'
  }).items;

  // Compare calendar name
  for (var i = 0; i < cals.length; i++)
    hiddenCal.push({ id: cals[i].id, summary: cals[i].summary, accessRole: cals[i].accessRole });
  return hiddenCal;
}

/* --------------------------- Utilities --------------------------- */

/**
 * This function is a function that show the special events list in 'Do not delete' calendar
 * So when we open the right side panel, they can find the event that they register
 */

function onCalendarHomePageOpen() {
  // Set up trigger for button click event
  var triggers = ScriptApp.getProjectTriggers();
  var addOnName = 'onEventUpdate';
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getHandlerFunction().indexOf(addOnName) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Initializing store value
  PropertiesService.getUserProperties().setProperty('clickedCalId', '');

  var card = CardService.newCardBuilder()
    .setName('MainCard')
    .setHeader(CardService.newCardHeader().setTitle('This is special events list.'));

  // Get special events calendar
  var calIds = getMyHiddenCalendarId();
  var calendar = null;
  if (calIds.filter(item => item.summary === calendarName).length === 0) {
    calendar = CalendarApp.createCalendar(
      calendarName, {
      summary: 'This is special events list.',
      color: CalendarApp.Color.RED_ORANGE,
      hidden: true,
      selected: false,
      timeZone: 'America/New_York'
    });
    calIds.push({ id: calendar.getId(), summary: calendarName, accessRole: 'owner' });
  }
  var existData = 0;
  calIds.filter(item => item.summary.indexOf(majorName) > -1).map((calId) => {
    calendar = CalendarApp.getCalendarById(calId.id);
    calendar.setHidden(true);

    if (calId.summary === calendarName && calId.accessRole === 'owner') {
      // Get shared people for this user's default calendar
      var sharedPeople = getSharedPeople(CalendarApp.getDefaultCalendar().getId());
      for (var i = 0; i < sharedPeople.length; i++) {
        if (sharedPeople[i].email !== Session.getActiveUser().getEmail()) {
          shareCalendar(calendar.getId(), sharedPeople[i].email, sharedPeople[i].role);
        }
      }
    }

    var today = new Date();
    var specialEvents = calendar.getEventsForDay(today);
    existData += specialEvents.length;

    if (specialEvents.length !== 0)
      card.addSection(
        CardService.newCardSection().addWidget(
          CardService.newTextParagraph().setText(
            calendar.getName().replace(majorName, '')
          )
        )
      );
    // Get all special events list (All pecial events are daily events, so we can get all special events as getting daily events list)
    for (var i = 0; i < specialEvents.length; i++) {
      var description = specialEvents[i].getDescription();
      var cardSection = CardService.newCardSection();
      cardSection
        .addWidget(
          CardService.newTextParagraph().setText(specialEvents[i].getTitle() === '' ? 'No Title' : specialEvents[i].getTitle())
        )
        .addWidget(
          CardService.newTextParagraph().setText(description === '' ? 'No Description' : omite(description))
        );
      if (calId.accessRole === 'owner' || calId.accessRole === 'writer') {
        try {
          ScriptApp.newTrigger(addOnName)
            .forUserCalendar(calId.id)
            .onEventUpdated()
            .create();
        } catch (e) {
          Logger.log(e);
        }
        cardSection
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService
                  .newTextButton()
                  .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
                  .setText('Edit')
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName('editClicked')
                      .setParameters({ 'clickedEventId': specialEvents[i].getId(), 'clickedCalId': calId.id })
                  )
              )
              .addButton(
                CardService
                  .newTextButton()
                  .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
                  .setText('Restore')
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName('restoreClicked')
                      .setParameters({ 'clickedEventId': specialEvents[i].getId(), 'clickedCalId': calId.id })
                  )
              )
          );
      }
      card.addSection(cardSection);
    }
  });

  if (!existData) {
    card.addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText('No special events in list.')
        )
    );
    existData = 0;
  }

  card = card.build();

  return card;
}

/**
 * This function is a function called when event button which is located right side clicked
 * So in that function, we redirect to Google event edition page
 */

function editClicked(e) {
  try {
    if (PropertiesService.getUserProperties().getProperty('clickedCalId') !== '') {
      var notification = CardService.newNotification()
        .setText('Close other editing window.');
      return CardService.newActionResponseBuilder()
        .setNotification(notification)
        .build();
    }
    var clickedEventId = e.parameters.clickedEventId;
    var clickedCalId = e.parameters.clickedCalId;
    const event = CalendarApp.getCalendarById(clickedCalId).getEventById(clickedEventId);
    var eventUrl = 'https://calendar.google.com/calendar/r/eventedit/' +
      Utilities.base64Encode(
        event.getId().split('@')[0] + '_' + event.getStartTime().toISOString().replace(/[^0-9,^T]/g, "").slice(0, -3) + "Z" +
        " " +
        event.getOriginalCalendarId()
      ).replace(/\=/g, '');
    // encodeURI(
    //   'text=' + event.getTitle() +
    //   '&dates=' + new Date().toLocaleString() + '/' + new Date(new Date().getTime() + 30 * 60 * 1000).toLocaleString() +
    //   '&src=' + event.getOriginalCalendarId() +
    //   '&details=' + event.getDescription());
    PropertiesService.getUserProperties().setProperty('clickedCalId', clickedCalId);
    return CardService.newActionResponseBuilder().setOpenLink(
      CardService.newOpenLink()
        .setUrl(eventUrl)
        .setOpenAs(CardService.OpenAs.OVERLAY)
        .setOnClose(CardService.OnClose.RELOAD)
    ).build();
  } catch (e) {
    Logger.log(e);
  }
}

/**
 * This function is a function called when restore button which is located right side clicked
 * So in that function, we restore the event with it's data
 */

function restoreClicked(e) {
  try {
    var clickedCalId = e.parameters.clickedCalId;
    var calendar = CalendarApp.getCalendarById(clickedCalId);

    var clickedEventId = e.parameters.clickedEventId;
    var userEvent = calendar.getEventById(clickedEventId);
    var allEvents = calendar.getEventSeriesById(clickedEventId);

    var calendarId = PropertiesService.getUserProperties().getProperty(userEvent.getId());

    var diffTime = userEvent.getEndTime() - userEvent.getStartTime();

    var startTime = userEvent.getStartTime();
    startTime = new Date(
      new Date(
        new Date().setHours(startTime.getHours())
      ).setMinutes(startTime.getMinutes())
    ).setSeconds(startTime.getSeconds());

    var endTime = startTime + diffTime;

    CalendarApp.getCalendarById(calendarId).createEvent(
      userEvent.getTitle(),
      new Date(startTime),
      new Date(endTime),
      { description: userEvent.getDescription(), location: userEvent.getLocation() }
    );

    allEvents.deleteEventSeries();
    PropertiesService.getUserProperties().deleteProperty(userEvent.getId());

    var notification = CardService.newNotification()
      .setText(`Event restored to <b>` + CalendarApp.getCalendarById(calendarId).getName() + `</b> calendar.`);
    return CardService.newActionResponseBuilder()
      .setStateChanged(true)
      .setNavigation(CardService.newNavigation().updateCard(onCalendarHomePageOpen()))
      .setNotification(notification)
      .build();
  } catch (e) {
    Logger.log(e);
  }
}

/**
 * This function is a function that delete the special event when user delete the real event
 */

function onEventUpdate(e) {
  try {
    var today = new Date(new Date().getTime() - 1 * 60 * 1000).toISOString();
    var clickedCalId = PropertiesService.getUserProperties().getProperty('clickedCalId');
    var event = Calendar.Events.list(CalendarApp.getCalendarById(clickedCalId).getId(), {
      fields: 'items(id,summary,status)',
      maxResults: 1,
      updatedMin: today,
      orderBy: 'updated'
    }).items[0];
    var clickedCalendar = CalendarApp.getCalendarById(clickedCalId);

    // If there aren't any update
    if (event === null || event === undefined) return;

    var userEvent = clickedCalendar.getEventById(event.id);
    var diffTime = userEvent.getEndTime() - userEvent.getStartTime();
    var startTime = userEvent.getStartTime();

    var calendarId = PropertiesService.getUserProperties().getProperty(userEvent.getId());
    PropertiesService.getUserProperties().deleteProperty(userEvent.getId());

    startTime = new Date(
      new Date(
        new Date().setHours(startTime.getHours())
      ).setMinutes(startTime.getMinutes())
    ).setSeconds(startTime.getSeconds());

    var endTime = startTime + diffTime;

    var intervalVal = Math.floor(diffTime / (3600 * 24 * 1000));

    clickedCalendar.getEventSeriesById(event.id).deleteEventSeries();
    var newEvents = clickedCalendar.createEventSeries(
      userEvent.getTitle(),
      new Date(startTime),
      new Date(endTime),
      CalendarApp.newRecurrence().addDailyRule().interval(intervalVal === 0 ? 1 : intervalVal),
      { description: userEvent.getDescription(), location: userEvent.getLocation() }
    );

    PropertiesService.getUserProperties().setProperty(newEvents.getId(), calendarId);

    PropertiesService.getUserProperties().setProperty('clickedCalId', '');
  } catch (e) {
    Logger.log(e);
  }
}

/**
 * This function is a function that show the selected event in more detail on right side window
 */

function onCalendarEventOpen(e) {
  if (e.calendar === undefined) return;

  try {
    var event = CalendarApp.getCalendarById(e.calendar.calendarId).getEventById(e.calendar.id);
    var cardSection = CardService.newCardSection();
    var newFlag = event === null;
    var ownerFalg = e.calendar.calendarId === CalendarApp.getDefaultCalendar().getId();
    if (!ownerFalg) {
      var accessRole = getMyHiddenCalendarId().filter(item => item.id === e.calendar.calendarId)[0].accessRole;
      ownerFalg = accessRole === 'writer' || accessRole === 'owner';
    }
    ownerFalg = ownerFalg && e.calendar.calendarId === e.calendar.organizer.email;

    cardSection.addWidget(
      CardService
        .newTextParagraph()
        .setText(newFlag ?
          'Add to speical events list'
          :
          event.getTitle() === '' ? 'No Title' : event.getTitle()));
    cardSection.addWidget(
      CardService
        .newTextParagraph()
        .setText(newFlag ?
          'You can add new event after save event.'
          :
          event.getDescription() === '' ? 'No description' : omite(event.getDescription())));
    if (!newFlag) {
      cardSection.addWidget(
        CardService.newTextParagraph()
          .setText(event.getStartTime() + ' ~ ' + event.getEndTime())
      );
    }
    // If you are owner for this calendar you can edit this event, you can look the button
    if (ownerFalg && !newFlag) {
      cardSection.addWidget(
        CardService.newButtonSet().addButton(
          CardService.newTextButton()
            .setText('Add event')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('addSpecialEvent')
            )
        )
      );
    }

    var card = CardService.newCardBuilder()
      .setName('AddEventCard')
      .setHeader(CardService.newCardHeader().setTitle('Calendar Event Create'))
      .addSection(cardSection)
      .build();

    return card;
  } catch (e) {
    Logger.log(e);
  }
}

/**
 * This function is a function that creates an event to Special events list
 * If there are calendar named 'Do not delete', it creates only event to that calendar
 * And if there aren't, it creates a calendar named 'Do not delete'
 * And users can view that calendar on their calendar setting
 */

function addSpecialEvent(event) {
  try {
    var calId = getMyHiddenCalendarId().filter(item => item.summary === calendarName);
    var calendar = calId.length !== 0 ? CalendarApp.getCalendarById(calId[0].id) :
      CalendarApp.createCalendar(
        calendarName, {
        summary: 'This is special events list.',
        color: CalendarApp.Color.RED_ORANGE,
        hidden: true,
        selected: false,
        timeZone: 'America/New_York'
      });

    var userEvent = CalendarApp.getCalendarById(event.calendar.calendarId).getEventById(event.calendar.id);

    var diffTime = userEvent.getEndTime() - userEvent.getStartTime();

    var startTime = userEvent.getStartTime();

    startTime = new Date(
      new Date(
        new Date().setHours(startTime.getHours())
      ).setMinutes(startTime.getMinutes())
    ).setSeconds(startTime.getSeconds());

    var endTime = startTime + diffTime;

    var intervalVal = Math.floor(diffTime / (3600 * 24 * 1000));

    var newEvents = calendar.createEventSeries(
      userEvent.getTitle(),
      new Date(startTime),
      new Date(endTime),
      CalendarApp.newRecurrence().addDailyRule().interval(intervalVal === 0 ? 1 : intervalVal),
      { description: userEvent.getDescription(), location: userEvent.getLocation() }
    );

    PropertiesService.getUserProperties().setProperty(newEvents.getId(), event.calendar.calendarId);

    userEvent.deleteEvent();
    var notification = CardService.newNotification()
      .setText('Event added in rescheduling event list.');
    return CardService.newActionResponseBuilder()
      .setStateChanged(true)
      .setNavigation(CardService.newNavigation().updateCard(onCalendarHomePageOpen()))
      .setNotification(notification)
      .build();
  } catch (e) {
    Logger.log(e);
  }
}
