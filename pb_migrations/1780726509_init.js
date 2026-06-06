/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Update the 'users' auth collection
  const users = app.findCollectionByNameOrId("users");
  
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";
  users.updateRule = "id = @request.auth.id || @request.auth.isadmin = true";
  users.deleteRule = "id = @request.auth.id || @request.auth.isadmin = true";

  // Add fields to users using correct constructors
  try {
    users.fields.add(new TextField({
      name: "displayname",
      required: false
    }));
  } catch (e) {
    console.log("Error adding displayname:", e);
  }

  try {
    users.fields.add(new NumberField({
      name: "totalpoints",
      required: false,
      min: 0
    }));
  } catch (e) {
    console.log("Error adding totalpoints:", e);
  }

  try {
    users.fields.add(new BoolField({
      name: "isadmin",
      required: false
    }));
  } catch (e) {
    console.log("Error adding isadmin:", e);
  }

  app.save(users);

  // 2. Create 'teams' collection
  const teams = new Collection({
    name: "teams",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.isadmin = true",
    updateRule: "@request.auth.isadmin = true",
    deleteRule: "@request.auth.isadmin = true",
    fields: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "flagurl",
        type: "text",
        required: true
      }
    ]
  });
  app.save(teams);

  // 3. Create 'matches' collection
  const matches = new Collection({
    name: "matches",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.isadmin = true",
    updateRule: "@request.auth.isadmin = true",
    deleteRule: "@request.auth.isadmin = true",
    fields: [
      {
        name: "matchnumber",
        type: "number",
        required: true
      },
      {
        name: "date",
        type: "text",
        required: true
      },
      {
        name: "time",
        type: "text",
        required: true
      },
      {
        name: "venue",
        type: "text",
        required: true
      },
      {
        name: "teamaid",
        type: "relation",
        required: true,
        collectionId: teams.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: "teambid",
        type: "relation",
        required: true,
        collectionId: teams.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: "scorea",
        type: "number",
        required: false
      },
      {
        name: "scoreb",
        type: "number",
        required: false
      },
      {
        name: "status",
        type: "text",
        required: true
      },
      {
        name: "stage",
        type: "text",
        required: false
      }
    ]
  });
  app.save(matches);

  // 4. Create 'quinielas' collection
  const quinielas = new Collection({
    name: "quinielas",
    type: "base",
    fields: [
      {
        name: "userid",
        type: "relation",
        required: true,
        collectionId: users.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: "matchid",
        type: "relation",
        required: true,
        collectionId: matches.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: "predictedscorea",
        type: "number",
        required: true
      },
      {
        name: "predictedscoreb",
        type: "number",
        required: true
      },
      {
        name: "pointsearned",
        type: "number",
        required: false
      },
      {
        name: "updatedat",
        type: "text",
        required: false
      }
    ]
  });
  app.save(quinielas);

  // Set rules now that the collection schema/fields registry has been saved
  quinielas.listRule = "@request.auth.id != ''";
  quinielas.viewRule = "@request.auth.id != ''";
  quinielas.createRule = "@request.auth.id != '' && (userid = @request.auth.id || @request.auth.isadmin = true)";
  quinielas.updateRule = "@request.auth.id != '' && (userid = @request.auth.id || @request.auth.isadmin = true)";
  quinielas.deleteRule = "@request.auth.id != '' && (userid = @request.auth.id || @request.auth.isadmin = true)";
  app.save(quinielas);
}, (app) => {
  try {
    const quinielas = app.findCollectionByNameOrId("quinielas");
    app.delete(quinielas);
  } catch (e) {}
  
  try {
    const matches = app.findCollectionByNameOrId("matches");
    app.delete(matches);
  } catch (e) {}
  
  try {
    const teams = app.findCollectionByNameOrId("teams");
    app.delete(teams);
  } catch (e) {}
});
