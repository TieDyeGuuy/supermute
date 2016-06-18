import urllib.request
import json
import pprint
import sys
import re

class HatebaseError(Exception):
  def __init__(self, error_code, human_readable_error):
    self.error_code = eval(error_code)
    self.human_readable_error = human_readable_error

  def __str__(self):
    return "error code: " + repr(self.error_code) \
           + "; \nhuman readable error: " + self.human_readable_error

private_access_key = ""
# each key is private for the person accessing the hatebase.
with open('..\private\key.txt', 'r') as f:
  private_access_key = f.read().strip()

def getQuery(vocab = True, **filters):
  """
  Constructs propper url to query the hatebase database. Then queries the
  Hatebase and returns the results as a json object.

  When vocab is set to true (by default) the function searches the hatebase for
  vocabulary. Otherwise it searches for sightings. Go to
  http://www.hatebase.org for more information. Also check the Hatebase API to
  see which filterss you can use.

  Returns the information received from the hatebase and will raise exceptions
  if there are issues connecting to the hatebase or if the hatebase returns
  it's own errors.
  """
  # if this method starts to misbehave, check to see if hatebase has updated
  # to a new version number.
  query_str = "http://api.hatebase.org/v3-0/"
  query_str += private_access_key + "/"
  query_str += "vocabulary/" if vocab else "sightings/"
  query_str += "json/"
  # hatebase will also return xml documents if desired.

  for k,v in filters.items():
    query_str += str(k) + "%3D" + str(v) + "%7C"

  if len(filters) > 0:
    query_str = query_str[:-3]

  hatedata = None

  with urllib.request.urlopen(query_str) as response:
    html = response.read().decode("utf-8")
    hatedata = json.loads(html)

  if not hatedata:
    raise HatebaseError('7', 'Failed to connect to the Hatebase')

  if 'error_code' in hatedata['errors']:
    raise HatebaseError(hatedata['errors']['error_code'],
                        hatedata['errors']['human_readable_error'])

  return hatedata

def getAllPages():
  """
  Returns all english vocabulary from the hatebase.
  """
  print("Getting page 1")
  hatedata = getQuery(language = 'eng')
  data = hatedata['data']['datapoint']
  warnings = hatedata['warnings']
  nqueries = hatedata['number_of_queries_today']
  status = hatedata['status']
  pageTot = int(hatedata['number_of_results']) / \
            int(hatedata['number_of_results_on_this_page']) + 1
  pageTot = int(pageTot)
  for p in range(2, pageTot + 1):
    print("Getting page " + str(p))
    newdata = getQuery(language = 'eng', page = str(p))
    data += newdata['data']['datapoint']
    if 'warning_code' in newdata['warnings']:
      warnings.update(newdata['warnings'])

    nqueries = newdata['number_of_queries_today']
    status = newdata['status']

  hatedata['data']['datapoint'] = data
  hatedata['warnings'] = warnings
  hatedata['number_of_queries_today'] = nqueries
  hatedata['status'] = re.sub(r".*(Hatebase )API( on .*[AP]M\.).*",
                              r"\1accessed\2", status)
  del hatedata['page']
  del hatedata['number_of_results_on_this_page']
  print("Finished retrieving data")
  return hatedata

def writeHatebase():
  """
  Gets most up to date data from hatebase and writes it to 'hatebase.json'
  """
  with open('hatebase.json', 'w') as f:
    hatedata = getAllPages()
    json.dump(hatedata, f, indent = 2, sort_keys = True)

def readHatebase():
  """
  Retrieves data from 'hatebase.json'
  """
  hatedata = None
  with open('hatebase.json', 'r') as f:
    hatedata = json.load(f)
  return hatedata

#writeHatebase('hatebase.json')
