import glob
import json
import hatebase_query

# data representations of hatebase data so as to not disturb the files too much
hate = hbu = None
# the next word in the hbu that needs to be updated and enhanced.
next_word = -1

def getHate():
  """
  Grabs data from 'hatebase.json' and 'hbu.json'. 'hatebase.json' is the file
  used directly with the Hatebase API and 'hbu.json' is the file used to be
  an enhanced version of 'hatebase.json' with a few extra keys in the data.
  """
  global hate
  global hbu
  if hate:
    return
  path = glob.glob('../**/hbu.json', recursive = True)[0]
  with open(path, 'r') as f:
    hbu = json.load(f)

  if not hbu:
    raise Exception('trouble opening hbu.json')
  hate = hatebase_query.readHatebase()

def light_update():
  """
  Adds new datapoints to 'hbu.json' from 'hatebase.json' but does not care
  about specifics of each wordcard.
  """
  numhate = int(hate['number_of_results'])
  numhbu = int(hate['number_of_results'])
  if numhate > numhbu:
    print("update needed")
    hateA = list(map(lambda x: x['vocabulary'], hate['data']['datapoint']))
    hbuA = list(map(lambda x: x['vocabulary'], hbu['data']['datapoint']))
    for i,word in enumerate(hateA):
      if word not in hbuA:
        hbu['data']['datapoint'].insert(i, hate['data']['datapoint'][i])
        numhbu += 1
    if numhate != numhbu:
      print("full update needed")
      full_update()
    hbu['number_of_results'] = str(numhbu)

def full_update():
  """
  Makes 'hbu.json' and 'hatebase.json' match but does not remove the
  enhancements from 'hbu.json'
  """
  hateA = list(map(lambda x: x['vocabulary'], hate['data']['datapoint']))
  hbuA = list(map(lambda x: x['vocabulary'], hbu['data']['datapoint']))
  for i,word in enumerate(hbuA):
    if word not in hateA:
      print("deleting " + word)
      hbu['data']['datapoint'].pop(i)
  for i,word in enumerate(hateA):
    if word not in hbuA:
      print("adding " + word)
      hbu['data']['datapoint'].insert(i, hate['data']['datapoint'][i])
    else:
      word_update = False
      for k,v in hate['data']['datapoint'][i].items():
        if hbu['data']['datapoint'][i][k] != v:
          word_update = True
          hbu['data']['datapoint'][i][k] = v
      if word_update:
        print("updating " + word)
  for k,v in hate.items():
    if k != 'data':
      if hbu[k] != v:
        print("updating " + k)
        hbu[k] = v

def print_next_word():
  global next_word
  if next_word != -1 and 'other_meaning' in hbu['data']['datapoint'][next_word]:
      next_word = -1
  if next_word == -1:
    for i,word in enumerate(hbu['data']['datapoint']):
      if 'other_meaning' not in word:
        next_word = i
        break
    else:
      print("NO NEXT WORD")
      return
  wordcard = hbu['data']['datapoint'][next_word]
  print("Word: " + wordcard['vocabulary'])
  print("Meaning: " + wordcard['meaning'])

def update_word(word, meaning, acronym, context, location):
  global next_word
  hbuA = list(map(lambda x: x['vocabulary'], hbu['data']['datapoint']))
  i = hbuA.index(word)
  meaning = '1' if meaning else '0'
  acronym = '1' if acronym else '0'
  hbu['data']['datapoint'][i].update(other_meaning = meaning,
                                     small_acronym = acronym,
                                     primary_contexts = context,
                                     primary_location = location)
  next_word += 1

def write_hbu():
  path = glob.glob('../**/hbu.json', recursive = True)[0]
  with open(path, 'w') as f:
    json.dump(hbu, f, indent = 2, sort_keys = True)

getHate()
