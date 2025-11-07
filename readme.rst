Interactive Template
=====================

What is it?
-----------

This template contains all the setup required to start building a flat-file
news application. Although it's a good starting place, providing reasonable
defaults and data sources, it is not opinionated about front-end frameworks
or overall application architecture. Out of the box, it provides:

- HTML templating using EJS with Markdown rendering
- JavaScript bundling using Rollup
- CSS bundling using PostCSS
- A smart dev server (courtesy of `Eleventy <https://11ty.dev>`_)
- Data pipelines for loading:

  - Text from Google Docs
  - Structured data from Google Sheets or CSV
  - Automatic ArchieML parsing from text

- Deployment and asset synchronization with S3

*Executive summary:* Provides everything you need to start building a
news app or interactive graphic.

Installation
------------

Before you begin, you'll need to have the following installed:

-  NodeJS/NPM
-  The Heist task runner installed globally (``npm i -g @twilburn/heist``)

If you would like to edit this starter for your own purposes, you can clone
the repo to a folder and then run ``npm link`` to install the
`create-interactive` command (which is what it's running under the hood).

Getting Started
---------------

For our first project, we'll do something pretty simple. Open a terminal,
make a new folder for your project, and run ``npm init chalkbeat/interactive``:

.. code:: sh

    cd ~
    mkdir example-app
    cd example-app
    npm init chalkbeat/interactive

It is worth noting what this is precisely doing: when called with
an "initializer," ``npm init`` will go out and download the module, then run
its default executable (the ``bin`` field of its package.json file). In this
case, we are using a Git endpoint, not an NPM target (they look similar, but
NPM users have an ``@`` in front, whereas a slash-delimited package name is a
GitHub username/repo). We have chosen this method over a "real" NPM package
because it allows us to iterate much faster as a team, instead of needing to
bump the package version and republish every time there's a change.

The scaffolding script will pull some information from the environment, then
set up some folders and source files for you in the current directory (the one
seen in the output of ``pwd``), and install the NPM modules needed for this
project. After npm hands you back to the prompt, type ``heist`` at
the command line to compile the project and start a local development server
at ``http://localhost:8000``.

This is all well and good, but the page itself isn't very exciting at
the start, because there's nothing in it. There are three default files
that are created for you to start your project:

-  ``/src/index.html`` - The primary HTML file for the project
-  ``/src/js/main.js`` - The entry point for all JavaScript on the page
-  ``/src/css/seed.css`` - The bootstrap file for LESS compilation into
   CSS

If you open up ``src/index.html``, and edit it while Heist is running, the dev
server will see your changes and re-run the relevant task. Likewise, editing
``seed.css`` (or any other stylesheet in the ``src/css`` directory) will
cause the build system to recompile your CSS, and editing any JavaScript
files in the ``src/js`` file will cause it to rebuild ``/build/app.js`` based
on your  dependencies from ``src/js/main.js``. These changes are baked out
into the ``build`` folder for publishing, but also served up via the local
development server on port 8000.

Data and Templating
-------------------

The ``index.html`` template (and any other templates you choose to add to the
project) are processed using EJS templating (HTML files starting with an
``_`` will be ignored). If you have any CSV files located in your ``data``
directory, these will be parsed and made available to your templates via the
``csv`` object (likewise, JSON files in the ``data`` directory will be loaded
to the ``json`` object, keyed by their filename). For example, maybe you have
a CSV file located at ``data/ceoData.csv`` containing columns of data
named "company", "name", "age", "gender", and "salary". We could write the
following template in our ``index.html`` file to output this as an HTML
table::

    <table>
      <thead>
        <tr>
          <th>Name
          <th>Company
          <th>Salary
      <tbody>
        <% csv.ceoData.forEach(function(ceo) { %>
        <tr>
          <td><%= ceo.name %>
          <td><%= ceo.company %>
          <td><%= t.formatMoney(ceo.salary) %>
        <% }); %>
    </table>

In addition to on-disk data, you can set the template to import data from
Google Sheets. This is a great option for collaborating with other newsroom
staff, who may find Google Drive easier than Excel (especially when it comes
to sharing files). You'll also need to run ``heist google-auth`` to create a
local OAuth token before you can talk to the API. Once authenticated, the
easiest way to link a sheet to your project is to create it from the command
line task::

    heist google-create --type=sheets --name="My Document Name"

This will generate the file in your Drive account and add its key to the
project configuration. You can also import existing sheets by their IDs: open
the ``project.json`` file and add your workbook key to the ``sheets`` array
found there.  Once the workbook key is set and you're authenticated, running
``heist sheets`` will download the data from Google and cache it as JSON (one
file per worksheet). 

As with CSV, the data will be stored as an array unless one of your columns is
named "key," in which case it'll be stored as a hash table to each row object.
If there are only two columns named "key" and "value," it'll simplify that
structure by putting the value column directly into the lookup (i.e., you can
use ``sheet.key`` to get the value, instead of ``sheet.key.value``). You can
also append a type notation to your column name, separating it from the key
with a colon (e.g., "zipcode:text", "percapita:number", or "enabled:boolean").

When placing data into your HTML via Lo-dash, there are some helper
functions that are also made available via ``t``, as seen above with
``t.formatMoney()``. These are defined in ``tasks/build.js``, but you
should feel free to add your own. One that may prove useful is
``t.include()``, which will import another file into the template for
processing. For example, we might import a header and footer with the
following template::

    <%= t.include("partials/_head.html") %>
    This space intentionally left blank.
    <%= t.include("partials/_foot.html") %>

You can also pass data to an included template file using the second argument
to ``t.include()``, like so::

    <%= t.include("partials/_ad.html", { type: "banner" }) %>

This will load our ad block, sized for a "banner" slot (other common slots are "square" and "tall"). We include a number of partials as useful building blocks.

If you need to pull in article text, we strongly recommend using
`ArchieML <http://archieml.org>`_ to load text and data chunks into your
regular HTML templates. Any file with a ``.txt`` extension in the ``data``
folder will be exposed as ``archieml.{filename}``. You can use Markdown
syntax in ArchieML files by using the ``t.renderMarkdown()`` function in your
templates to process content::

    <main class="article">
      <%= t.renderMarkdown(archieml.story.intro) %>
    </main>

The template also includes a task (``docs``) for downloading Google Docs, much
the same way as Sheets, and the ``google-create`` task can be used to
automatically create/link them if you specify ``--type=docs``. They'll be
cached as ``.docs.txt`` in the data folder, and then loaded as ArchieML.

Access to Docs requires your machine to have a
Google OAuth token, which is largely the same as described in `this post
<http://blog.apps.npr.org/2015/03/02/app-template-oauth.html>`_.
You can obtain a token by running ``heist google-auth``.

While Sheets are specified in ``project.json`` as an array, Docs should be set
as an object mapping filename to document ID::

    "docs": {
      "story": "id-string-here"
    }

This would cause your rig to download the document as ``story.docs.txt``, then
accessible for templating at ``archieml.story``.

Client-side Code
----------------

Let's install Leaflet and add it to our JavaScript bundle. From the
project folder, run the following command:

.. code:: sh

    npm install leaflet --save

Now we'll change ``src/js/main.js`` to load Leaflet:

.. code:: javascript

    var L = require("leaflet"); //load Leaflet from an NPM module
    console.log(L);

When we restart our dev server by running the ``heist`` command, the
``bundle`` task will scan the dependencies it finds, starting in
``src/js/main.js``, and build those into a single file at ``build/app.js``
(which is already included in the default HTML template). 

The template also includes a number of smaller helper modules that we didn't
think were important enough to publish to NPM. You can always load these
modules with the relative path:

.. code:: javascript

    //this enables social widgets and ad code
    //no return value is needed
    require("./lib/social");
    require("./lib/ads");

    //load our animated scroll and FLIP animation helpers for use
    var animateScroll = require("./lib/animateScroll");
    var flip = require("./lib/flip");

These micro-modules cover most of the basic DOM manipulation that you would need
for a news apps, short of importing a full framework.

* ``debounce.js`` - Equivalent of Underscore's debounce()
* ``delegate.js`` - Equivalent of calling jQuery.on() with event delegation
* ``dom.js`` - Build HTML in JS, similar to React.createElement()
* ``dot.js`` - Compile client-side EJS templates with the same syntax used by the build system
* ``flip.js`` - Animate smoothly using `FLIP <https://aerotwist.com/blog/flip-your-animations/>`_
* ``qsa.js`` - Aliases for ``document.querySelectorAll()`` (as ``$``) and ``querySelector()`` (as ``$.one()``)

Rollup plugins for loading text files (with extensions ``.txt`` and
``.html``) and CSS files (for creating web components) are included with the
template, so you can also just ``import`` those files the same way you
would other local modules. We often use this for our client-side templating:

.. code:: javascript

    //load the templating library preset
    var dot = require("./lib/dot");

    //get the template source and compile it
    var template = dot.compile( require("./_tmpl.html") );

In a similar fashion, to add more CSS to our project, we would create a new
CSS file in ``src/css``, then update our ``src/css/seed.css`` file to import
it like so:

.. code:: css

    @import "variables.css";
    @import "base.css";
    @import "project.css";

From this point, we can continue adding new HTML templates, new
JavaScript files, and new CSS imports, just by following these
conventions. Our page will be regenerated as we make changes as long as
the default Heist task is running, and the built-in live reload server
will even refresh the page for us!

Note that both the CSS and JS bundle tasks are designed to be easily
extensible: if you need to output multiple bundles for separate pages (such as
a primary page and a secondary embedded widget), you can add new seeds to
these files relatively easily, and then share code between both bundles.

Publishing your work
--------------------

By default, this template can publish to S3. Two publication targets are set
in ``project.json``: stage and live. Running ``heist publish`` will push
contents of the build folder to the staging bucket and path. To push to the
live bucket, you must first set ``production: true`` in your ``project.json``
file, then run ``heist publish:live``. This is to protect against accidental
publication.

When you run ``heist  publish``, it will read your AWS credentials from the
standard AWS  environment variables (``AWS_ACCESS_KEY_ID`` and 
``AWS_SECRET_ACCESS_KEY``). You must have these variables set before
publication. You should also make sure  your files have been rebuilt first,
either by running the default task  or by running the ``static`` task (``heist
static publish`` will do  both).

Thinking about tasks
---------------------

All of the above processes--templating, compiling styles and JavaScript, and
running the development server--are included in the default build task. This
process is composed out of smaller tasks, some of which in turn are themselves
composites of smaller units of work. We organize them in the ``heistfile.js``
file, but all code should be written and loaded from the ``tasks`` folder.

Conceptually, applications built on this template are organized around the
idea that we take inputs from various locations (``src``, ``data``, or a
remote API) and produce a static set of files in ``build``. Whenever possible,
these tasks are largely stateless: they do not retain or re-use information
between runs.

The default tasks currently defined by the rig are:

- ``archieml``: Loads ArchieML files from data/*.txt
- ``bundle``: Build client-side scripts
- ``clean``: Erase the contents of the build folder
- ``content``: Load content from data files
- ``copy``: Copy assets to the static folder
- ``cron``: Run the build on a timer
- ``css``: Compile styles from src/css/seed.css
- ``csv``: Convert CSV to JSON and load onto grunt.data
- ``docs``: Save Google Docs into the data folder
- ``google-auth``: Authenticates with Google for document download
- ``google-create``: Create a linked Drive file (i.e., Google Sheets or Docs)
- ``html``: Generate HTML files
- ``json``: Import JSON files from the data folder
- ``publish``: Pushes the build folder to S3
- ``quick``: Build without assets
- ``serve``: Run an 11ty dev server and enable watch tasks
- ``sheets``: Downloads from Google Sheets -> JSON
- ``static``: Build all files
- ``sync`: Synchronize large files with S3
- ``template``: Build HTML from content/templates
- ``update``: Download content from remote services

Knowing that these tasks are composable, we can use it to perform selective
operations, not just full builds. 

For example, a common problem is to quickly hotfix the JavaScript bundle for a
project. To do this, we want to clear out the contents of the build folder,
assemble just the JS scripts, and then publish it. So we might run ``heist
clean bundle publish:live``.

Similarly, let's say we just want to update the HTML for a project with fresh
edits from Google, but not take the time to build or upload scripts, assets,
and styles. We'll want to use the "template" meta-task, defined in the
heistfile, which loads all our data and runs the ``build`` task to generate
HTML against it. So for this, we might run ``heist docs sheets clean template
publish:live``.

Finally, on some projects, it may make sense to define a validation step that
checks data for integrity before continuing the build process (example: `the NPR
liveblog rig 
<https://github.com/nprapps/liveblog-standalone/blob/master/tasks/validate.js>`_).
By creating this task and then adding it to the "content" meta-task, it will
run every time the template loads. Then we can run ``heist docs sheets
content`` to load and validate fresh data, without needing to start the entire
rig or run all of the other things it can do.

Where does everything go?
-------------------------

::

    ├── build - generated, not checked in or included before the first build
    │   ├── assets
    │   ├── app.js
    │   ├── index.html
    │   └── style.css
    ├── data - folder for all JSON/CSV/ArchieML data files
    ├── heistfile.js
    ├── package.json - Node dependencies and metadata
    ├── project.json - various project configuration
    ├── src
    │   ├── assets - files will be automatically copied to /build/assets
    │   ├── css - project styles
    │   ├── index.html
    │   ├── partials - directory containing boilerplate template sections
    │   └── js
    │       ├── main.js
    │       └── lib - directory for useful micro-modules
    └── tasks - All build tasks


Technicalities
--------------

This template is licensed under the MIT License, so you are free to do
whatever you want with it. If you update or improve the build tasks contained
inside, we'd love to hear from you.

By default, the projects generated by this template are licensed under the
GPLv3, and we whole-heartedly recommend its usage. However, given that the
template itself is MIT-licensed, you are free to replace ``root/license.txt``
with the legal text of your choice, or remove it entirely.
